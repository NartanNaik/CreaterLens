import { OAuth2Client } from "google-auth-library";
import { db } from "../config/firebase.js";
import { encryptKey } from "../services/encryptionService.js";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

    // 2. Check if user already exists in Firebase
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // 3. NEW USER: Spawn a $0 limit OpenRouter Key using your Management Key
      const orResponse = await fetch('https://openrouter.ai/api/v1/keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_MANAGEMENT_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `User Key - ${payload.email}`,
          limit: 0 // Hard cap at $0.00 to guarantee only free models can be used
        })
      });
      
      if (!orResponse.ok) {
        console.error("OpenRouter API Error:", await orResponse.text());
        throw new Error("Failed to generate OpenRouter key.");
      }

      const orData = await orResponse.json();
      const rawApiKey = orData.key;

      // 4. Save isolated user profile with their securely Encrypted Key
      await userRef.set({
        email: payload.email,
        name: payload.name,
        encryptedOrKey: encryptKey(rawApiKey),
        createdAt: new Date().toISOString()
      });
    }

    // 5. Generate internal JWT for frontend session persistence
    const sessionToken = jwt.sign(
      { id: userId, email: payload.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    return res.status(200).json({ 
      success: true, 
      token: sessionToken, 
      user: { 
        id: userId, 
        name: payload.name, 
        email: payload.email 
      } 
    });

  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(401).json({ 
      success: false, 
      error: "Authentication failed." 
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
      { expiresIn: '7d' }
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