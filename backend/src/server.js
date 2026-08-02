import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

// VERCEL REQUIREMENT: Export the app so Vercel can run it
export default app;

// This ensures your local server works, but stops Vercel from crashing
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}