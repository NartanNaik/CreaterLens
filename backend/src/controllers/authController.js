import { OAuth2Client } from "google-auth-library";
import { db } from "../config/firebase.js";
import { encryptKey } from "../services/encryptionService.js";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const OWNER_EMAIL = "naiknartana@gmail.com";

/**
 * Production Data Healer: Ensures all legacy unowned documents
 * are strictly assigned to the master account and have the required
 * index fields (like createdAt) so Firestore doesn't hide them.
 */
const claimLegacyDataForOwner = async (ownerUserId) => {
  const collectionsToMigrate = ["profiles", "staging", "users_settings"];

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

        // 2. CRITICAL: Add missing createdAt field required by the Firestore Index
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
      console.error(`Failed to heal legacy collection ${colName}:`, err.message);
    }
  }
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
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: "Google token is required." 
      });
    }

    // 1. Verify Google Token securely
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const userId = payload.sub; // Google's immutable unique ID for this user
    const email = (payload.email || "").toLowerCase().trim();

    // 2. Fetch User & Settings Data
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    const settingsRef = db.collection("users_settings").doc(userId);
    const settingsDoc = await settingsRef.get();

    // 3. Initialize Default Columns for NEW (or uninitialized) Users
    // Username and Link are core (isCustom: false). Nation is dynamic/deletable (isCustom: true).
    if (!settingsDoc.exists) {
      await settingsRef.set({
        userId,
        columns: [
          { columnId: "username", displayName: "Username", inputType: "text", isCustom: false },
          { columnId: "link", displayName: "Link", inputType: "text", isCustom: false },
          { columnId: "nation", displayName: "Nation", inputType: "text", isCustom: true }
        ],
        createdAt: new Date().toISOString()
      });
    }

    // 4. Handle User Account Creation & Key Generation
    if (!userDoc.exists) {
      // NEW USER: Spawn a $0 limit OpenRouter Key
      const encryptedOrKey = await createOpenRouterUserKey(email);

      // Save isolated user profile with their securely Encrypted Key
      await userRef.set({
        email,
        name: payload.name || "",
        picture: payload.picture || "",
        role: email === OWNER_EMAIL ? "owner" : "user",
        encryptedOrKey,
        legacyMigrated: email === OWNER_EMAIL,
        createdAt: new Date().toISOString()
      });

      if (email === OWNER_EMAIL) {
        await claimLegacyDataForOwner(userId);
      }
    } else {
      const existingData = userDoc.data() || {};
      const updates = {};

      // Self-heal: If user doc exists without an OpenRouter key, generate it now
      if (!existingData.encryptedOrKey) {
        updates.encryptedOrKey = await createOpenRouterUserKey(email);
      }

      // Ensure owner legacy data is claimed once
      if (email === OWNER_EMAIL && !existingData.legacyMigrated) {
        await claimLegacyDataForOwner(userId);
        updates.legacyMigrated = true;
      }

      if (Object.keys(updates).length > 0) {
        await userRef.update(updates);
      }
    }

    // 5. Generate internal JWT for frontend session persistence
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
    return res.status(401).json({ 
      success: false, 
      error: error.message || "Authentication failed." 
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
    console.error("Token refresh failed:", error);
    return res.status(403).json({
      success: false,
      error: "Invalid or expired session."
    });
  }
};