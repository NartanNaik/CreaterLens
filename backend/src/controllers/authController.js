import { OAuth2Client } from "google-auth-library";
import { db } from "../config/firebase.js";
import { encryptKey } from "../services/encryptionService.js";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const OWNER_EMAIL = "naiknartana@gmail.com";

// An expired session token can still be silently refreshed for this long.
// After that the user has to sign in with Google again.
const REFRESH_WINDOW_SECONDS = 30 * 24 * 60 * 60;

// Firestore out-of-quota is gRPC code 8 (RESOURCE_EXHAUSTED).
const isQuotaError = (err) => err?.code === 8 || /RESOURCE_EXHAUSTED|quota/i.test(err?.message || "");

// Only an explicit `false` means "not done yet": accounts created before the setup page
// existed have no flags and must not be pushed through it.
// (Same rule as readOnboarding in settingsController.js.)
const readOnboarding = (data) => ({
  onboardingDone: data?.onboardingDone !== false,
  tourDone: data?.tourDone !== false
});

/**
 * Production Data Healer: Ensures all legacy unowned documents
 * are strictly assigned to the master account and have the required
 * index fields (like createdAt) so Firestore doesn't hide them.
 *
 * Returns true only if every collection was processed. The caller marks the
 * owner as migrated only on true, so a failure (e.g. quota exhausted mid-run)
 * is retried on the next login instead of being silently skipped forever.
 */
const claimLegacyDataForOwner = async (ownerUserId) => {
  const collectionsToMigrate = ["profiles", "staging", "users_settings"];
  let allOk = true;

  for (const colName of collectionsToMigrate) {
    try {
      const snapshot = await db.collection(colName).get();
      let batch = db.batch();
      let count = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const updates = {};

        // 1. Claim unowned or dummy data
        if (!data.userId || data.userId === "admin" || data.userId === "test") {
          updates.userId = ownerUserId;
        }

        // 2. Add missing createdAt field (kept for older documents)
        if (!data.createdAt) {
          // Preserve existing timestamps if they used a different key, otherwise use now
          updates.createdAt = data.timestamp || data.dateAdded || new Date().toISOString();
        }

        // If this document needs healing, add it to the batch
        if (Object.keys(updates).length > 0) {
          batch.update(doc.ref, updates);
          count++;

          // Commit in chunks of 490 (Firestore limit is 500 per batch)
          if (count === 490) {
            await batch.commit();
            batch = db.batch();
            count = 0;
          }
        }
      }

      // Commit any remaining updates in the final batch
      if (count > 0) {
        await batch.commit();
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

export const googleLogin = async (req, res) => {
  const { token } = req.body || {};

  if (!token) {
    return res.status(400).json({
      success: false,
      error: "Google token is required."
    });
  }

  // 1. Verify the Google token. Only a failure HERE is a 401 (bad/expired/foreign token).
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.error("Google token verification failed:", error?.message || error);
    return res.status(401).json({
      success: false,
      error: "Google sign-in could not be verified. Please try again."
    });
  }

  // 2. Everything after verification is our own backend: Firestore, OpenRouter, JWT.
  //    Those failures are 503/500, not "your login is wrong", and never leak raw internals.
  try {
    const userId = payload.sub; // Google's immutable unique ID for this user
    const email = (payload.email || "").toLowerCase().trim();

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    const settingsRef = db.collection("users_settings").doc(userId);
    const settingsDoc = await settingsRef.get();

    // Initialize default columns (and the setup/tour flags) for NEW users.
    // Username and Link are core (isCustom: false). Nation is dynamic/deletable (isCustom: true).
    let settingsData = settingsDoc.exists ? settingsDoc.data() : null;
    if (!settingsData) {
      settingsData = {
        userId,
        columns: [
          { columnId: "username", displayName: "Username", inputType: "text", isCustom: false },
          { columnId: "link", displayName: "Link", inputType: "text", isCustom: false },
          { columnId: "nation", displayName: "Nation", inputType: "text", isCustom: true }
        ],
        onboardingDone: false,
        tourDone: false,
        createdAt: new Date().toISOString()
      };
      await settingsRef.set(settingsData);
    }

    // User account creation & key generation
    let userData;
    if (!userDoc.exists) {
      // NEW USER: Spawn a $0 limit OpenRouter Key
      const encryptedOrKey = await createOpenRouterUserKey(email);

      userData = {
        email,
        name: payload.name || "",
        picture: payload.picture || "",
        role: email === OWNER_EMAIL ? "owner" : "user",
        encryptedOrKey,
        legacyMigrated: false,
        createdAt: new Date().toISOString()
      };
      await userRef.set(userData);
    } else {
      userData = userDoc.data() || {};

      // Self-heal: If user doc exists without an OpenRouter key, generate it now
      if (!userData.encryptedOrKey) {
        const encryptedOrKey = await createOpenRouterUserKey(email);
        await userRef.update({ encryptedOrKey });
        userData = { ...userData, encryptedOrKey };
      }
    }

    // Owner only: claim legacy unowned data once. Marked done only if it fully succeeded.
    if (email === OWNER_EMAIL && !userData.legacyMigrated) {
      const migrated = await claimLegacyDataForOwner(userId);
      if (migrated) {
        await userRef.update({ legacyMigrated: true });
      }
    }

    // Generate internal JWT for frontend session persistence
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
        email,
        ...readOnboarding(settingsData)
      }
    });
  } catch (error) {
    console.error("Google Auth Error:", error?.stack || error);

    if (isQuotaError(error)) {
      return res.status(503).json({
        success: false,
        code: "QUOTA_EXCEEDED",
        error: "The server's database quota is used up for now. Please try again later."
      });
    }

    return res.status(500).json({
      success: false,
      error: "Sign-in failed on the server. Please try again."
    });
  }
};

/**
 * Handle token refresh requests if your frontend relies on a refresh cycle
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

    // An old/leaked token must not be refreshable forever
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (decoded.exp && nowSeconds - decoded.exp > REFRESH_WINDOW_SECONDS) {
      throw new Error("Session is too old to refresh");
    }

    // Issue a fresh token
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
    console.error("Token refresh failed:", error?.message || error);
    return res.status(403).json({
      success: false,
      error: "Invalid or expired session."
    });
  }
};