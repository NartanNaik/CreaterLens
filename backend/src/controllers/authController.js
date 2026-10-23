import { OAuth2Client } from "google-auth-library";
import { FieldPath } from "firebase-admin/firestore";
import { db } from "../config/firebase.js";
import { encryptKey } from "../services/encryptionService.js";
import jwt from "jsonwebtoken";

// GOOGLE_CLIENT_ID may hold one Web client ID, or several separated by commas.
// The Flutter app must use the Web client ID as serverClientId so the token audience matches.
const GOOGLE_AUDIENCES = (process.env.GOOGLE_CLIENT_ID || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const client = new OAuth2Client(GOOGLE_AUDIENCES[0]);
const OWNER_EMAIL = "naiknartana@gmail.com";

const isQuotaError = (err) =>
  err?.code === 8 || /RESOURCE_EXHAUSTED/i.test(String(err?.message || ""));

/**
 * One-time legacy data claim for the owner account.
 * Pages through each collection (400 docs at a time, only the needed fields)
 * instead of loading a whole collection into memory.
 * Returns true only if every collection was processed, so the caller
 * sets legacyMigrated only after a full success and never re-scans afterwards.
 */
const PAGE_SIZE = 400;

const claimLegacyDataForOwner = async (ownerUserId) => {
  const collectionsToMigrate = ["profiles", "staging", "users_settings"];
  let allOk = true;

  for (const colName of collectionsToMigrate) {
    try {
      let last = null;

      for (;;) {
        let q = db
          .collection(colName)
          .orderBy(FieldPath.documentId())
          .select("userId", "createdAt", "timestamp", "dateAdded")
          .limit(PAGE_SIZE);
        if (last) q = q.startAfter(last);

        const snapshot = await q.get();
        if (snapshot.empty) break;

        const batch = db.batch();
        let pending = 0;

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const updates = {};

          if (!data.userId || data.userId === "admin" || data.userId === "test") {
            updates.userId = ownerUserId;
          }
          if (!data.createdAt) {
            updates.createdAt = data.timestamp || data.dateAdded || new Date().toISOString();
          }

          if (Object.keys(updates).length > 0) {
            batch.update(doc.ref, updates);
            pending++;
          }
        }

        if (pending > 0) await batch.commit();

        last = snapshot.docs[snapshot.docs.length - 1];
        if (snapshot.size < PAGE_SIZE) break;
      }
    } catch (err) {
      allOk = false;
      console.error(`Failed to heal legacy collection ${colName}:`, err.message);
    }
  }

  return allOk;
};

/**
 * Helper: Calls OpenRouter's Provisioning API to spawn a $0-capped key for a user
 */
const createOpenRouterUserKey = async (email) => {
  const managementKey = (process.env.OPENROUTER_MANAGEMENT_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, ""); // Strip accidental quotes from env var

  if (!managementKey) {
    throw new Error("OPENROUTER_MANAGEMENT_KEY is missing in environment variables.");
  }

  const orResponse = await fetch("https://openrouter.ai/api/v1/keys", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${managementKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: `User Key - ${email}`,
      limit: 0 // Hard cap at $0.00 to guarantee only free models can be used
    })
  });

  if (!orResponse.ok) {
    const errText = await orResponse.text();
    console.error("OpenRouter API Error:", errText);
    throw new Error(
      `Failed to generate OpenRouter key (${orResponse.status}). Ensure OPENROUTER_MANAGEMENT_KEY is a Provisioning Key from openrouter.ai/settings/provisioning-keys.`
    );
  }

  const orData = await orResponse.json();
  const rawApiKey = orData.key || orData?.data?.key;

  if (!rawApiKey) {
    console.error("Unexpected OpenRouter response structure:", orData);
    throw new Error("OpenRouter did not return a raw key string.");
  }

  return encryptKey(rawApiKey);
};

/**
 * Key provisioning must never block sign-in. If it fails, the user still logs in
 * and the self-heal branch below retries on the next login.
 */
const tryCreateOpenRouterUserKey = async (email) => {
  try {
    return await createOpenRouterUserKey(email);
  } catch (err) {
    console.error("OpenRouter key provisioning failed (will retry next login):", err.message);
    return null;
  }
};

export const googleLogin = async (req, res) => {
  // Step 1 failures are auth errors (401). Everything after is a server-side problem.
  let payload;
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Google token is required."
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_AUDIENCES.length > 1 ? GOOGLE_AUDIENCES : GOOGLE_AUDIENCES[0],
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.error("Google token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      error: "Google sign-in could not be verified."
    });
  }

  try {
    const userId = payload.sub; // Google's immutable unique ID for this user
    const email = (payload.email || "").toLowerCase().trim();

    // 2. Fetch user + settings in a single round trip
    const userRef = db.collection("users").doc(userId);
    const settingsRef = db.collection("users_settings").doc(userId);
    const [userDoc, settingsDoc] = await db.getAll(userRef, settingsRef);
    const isNewUser = !userDoc.exists;

    // 3. Default columns + onboarding flags for new (or uninitialised) users.
    // Username and Link are core (isCustom: false). Nation is deletable (isCustom: true).
    if (!settingsDoc.exists) {
      await settingsRef.set({
        userId,
        columns: [
          { columnId: "username", displayName: "Username", inputType: "text", isCustom: false },
          { columnId: "link", displayName: "Link", inputType: "text", isCustom: false },
          { columnId: "nation", displayName: "Nation", inputType: "text", isCustom: true }
        ],
        onboardingDone: false,
        tourDone: false,
        createdAt: new Date().toISOString()
      });
    } else {
      // Backfill the flags once. Brand-new accounts get the setup page and tour;
      // accounts that already existed are treated as done.
      const s = settingsDoc.data() || {};
      const backfill = {};
      if (typeof s.onboardingDone !== "boolean") backfill.onboardingDone = !isNewUser;
      if (typeof s.tourDone !== "boolean") backfill.tourDone = !isNewUser;
      if (Object.keys(backfill).length > 0) {
        await settingsRef.set(backfill, { merge: true });
      }
    }

    // 4. Account creation and key generation
    if (isNewUser) {
      const encryptedOrKey = await tryCreateOpenRouterUserKey(email);
      const isOwner = email === OWNER_EMAIL;

      await userRef.set({
        email,
        name: payload.name || "",
        picture: payload.picture || "",
        role: isOwner ? "owner" : "user",
        encryptedOrKey: encryptedOrKey || null,
        legacyMigrated: false,
        createdAt: new Date().toISOString()
      });

      if (isOwner) {
        const ok = await claimLegacyDataForOwner(userId);
        if (ok) await userRef.update({ legacyMigrated: true });
      } else {
        await userRef.update({ legacyMigrated: true }); // nothing to migrate for normal users
      }
    } else {
      const existingData = userDoc.data() || {};
      const updates = {};

      // Self-heal: user doc exists without an OpenRouter key
      if (!existingData.encryptedOrKey) {
        const encryptedOrKey = await tryCreateOpenRouterUserKey(email);
        if (encryptedOrKey) updates.encryptedOrKey = encryptedOrKey;
      }

      // Owner legacy data is claimed once, and the flag is set only after full success
      if (email === OWNER_EMAIL && !existingData.legacyMigrated) {
        const ok = await claimLegacyDataForOwner(userId);
        if (ok) updates.legacyMigrated = true;
      }

      if (Object.keys(updates).length > 0) {
        await userRef.update(updates);
      }
    }

    // 5. Internal JWT for session persistence (web and Flutter)
    const sessionToken = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      token: sessionToken,
      user: {
        id: userId,
        name: payload.name,
        email
      }
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    if (isQuotaError(error)) {
      return res.status(503).json({
        success: false,
        code: "QUOTA_EXCEEDED",
        error: "Database quota exceeded. Please try again later."
      });
    }
    return res.status(500).json({
      success: false,
      error: "Sign-in failed. Please try again."
    });
  }
};

/**
 * Token refresh: accepts an expired token, issues a fresh 7-day one.
 */
export const refreshTokenController = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Token required." });
    }

    const token = authHeader.split(" ")[1];

    // Ignore expiration on the old token just to decode the user payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

    if (!decoded || !decoded.id) {
      throw new Error("Invalid token payload");
    }

    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error("Token refresh failed:", error.message);
    return res.status(403).json({
      success: false,
      error: "Invalid or expired session."
    });
  }
};