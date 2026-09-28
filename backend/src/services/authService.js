import jwt from "jsonwebtoken";

// Security: Fallback array. We strongly recommend loading this from process.env.AUTH_USERS
// or moving to a hashed Firestore collection to prevent plaintext repository leaks.
const getValidUsers = () => {
  if (process.env.AUTH_USERS) {
    try {
      return JSON.parse(process.env.AUTH_USERS);
    } catch (error) {
      console.warn("⚠️ Failed to parse AUTH_USERS from environment. Using fallback credentials.");
    }
  }
  
  // Fallback credentials
  return [
    {
      id: "dnuof",
      password: "ssapre"
    },
    {
      id: "oufoc",
      password: "paredn"
    }
  ];
};

export const login = async (id, password) => {
  if (!id || !password || typeof id !== "string" || typeof password !== "string") {
    throw new Error("Invalid ID or password format.");
  }

  const users = getValidUsers();
  
  const user = users.find(
    (u) => u.id === id && u.password === password
  );

  if (!user) {
    throw new Error("Invalid ID or password.");
  }

  const secret = process.env.JWT_SECRET;
  // Fallback to JWT_SECRET if JWT_REFRESH_SECRET isn't defined yet to prevent crashes
  const refreshSecret = process.env.JWT_REFRESH_SECRET || secret; 
  
  if (!secret) {
    console.error("CRITICAL: JWT_SECRET is missing from environment variables.");
    throw new Error("Internal server configuration error.");
  }

  // 1. Short-Lived Access Token (15 Minutes)
  const token = jwt.sign(
    { id: user.id },
    secret,
    { expiresIn: "15m" }
  );

  // 2. Long-Lived Refresh Token (7 Days)
  const refreshToken = jwt.sign(
    { id: user.id },
    refreshSecret,
    { expiresIn: "7d" }
  );

  return {
    token,
    refreshToken,
    user: {
      id: user.id
    }
  };
};

export const refreshUserToken = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    throw new Error("No refresh token provided.");
  }

  const secret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || secret;

  if (!secret) {
    throw new Error("Internal server configuration error.");
  }

  try {
    // 1. Verify the signature and expiration of the refresh token
    const decoded = jwt.verify(incomingRefreshToken, refreshSecret);
    
    // 2. Verify the user hasn't been deleted or disabled since the token was issued
    const users = getValidUsers();
    const user = users.find((u) => u.id === decoded.id);

    if (!user) {
      throw new Error("User no longer exists.");
    }

    // 3. Issue a fresh Access Token (15 Minutes)
    const newToken = jwt.sign(
      { id: user.id },
      secret,
      { expiresIn: "15m" }
    );

    // 4. Issue a fresh Refresh Token (Token Rotation)
    const newRefreshToken = jwt.sign(
      { id: user.id },
      refreshSecret,
      { expiresIn: "7d" }
    );

    return {
      token: newToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    throw new Error("Invalid or expired refresh token.");
  }
};