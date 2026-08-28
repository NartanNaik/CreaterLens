import jwt from "jsonwebtoken";

export const generateToken = (id) => {
  if (!id || typeof id !== "string") {
    throw new Error("A valid User ID string is required to generate a token.");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("CRITICAL ERROR: JWT_SECRET is missing from environment variables.");
    throw new Error("Internal server configuration error.");
  }

  return jwt.sign(
    {
      id
    },
    secret,
    {
      expiresIn: "7d"
    }
  );
};

export const verifyToken = (token) => {
  if (!token || typeof token !== "string") {
    throw new Error("A valid token string is required for verification.");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("CRITICAL ERROR: JWT_SECRET is missing from environment variables.");
    throw new Error("Internal server configuration error.");
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    // We catch and re-throw a standardized error so the caller knows exactly what happened,
    // rather than leaking the internal jsonwebtoken stack trace.
    throw new Error("Invalid or expired token.");
  }
};