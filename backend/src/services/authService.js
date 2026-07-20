import jwt from "jsonwebtoken";

const users = [
  {
    id: "dnuof",
    password: "ssapre"
  },
  {
    id: "oufoc",
    password: "paredn"
  }
];

export const login = async (id, password) => {
  const user = users.find(
    (user) => user.id === id && user.password === password
  );

  if (!user) {
    throw new Error("Invalid ID or password.");
  }

  const token = jwt.sign(
    {
      id: user.id
    },
    process.env.JWT_SECRET,
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