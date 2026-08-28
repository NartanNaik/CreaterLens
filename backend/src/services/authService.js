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
  
  if (!secret) {
    console.error("CRITICAL: JWT_SECRET is missing from environment variables.");
    throw new Error("Internal server configuration error.");
  }

  const token = jwt.sign(
    {
      id: user.id
    },
    secret,
    {
      expiresIn: "7d"
    }
  );

  return {
    token,
    user: {
      id: user.id
    }
  };
};