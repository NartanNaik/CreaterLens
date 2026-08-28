import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

// Global safety net: Catch unhandled promises (e.g., background Bloom Filter timeouts)
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 [CRITICAL] Unhandled Promise Rejection:", reason);
  // We do not exit the process here so Vercel/Local server can stay alive
});

// Global safety net: Catch fatal synchronous errors
process.on("uncaughtException", (error) => {
  console.error("🚨 [CRITICAL] Uncaught Exception:", error);
  // For uncaught exceptions, it is generally safer to exit and let the host restart the app,
  // but in serverless (Vercel), this will just terminate the current invocation.
  if (process.env.NODE_ENV !== "production") {
    process.exit(1);
  }
});

// VERCEL REQUIREMENT: Export the app so Vercel can run it as a serverless function
export default app;

// This ensures your local server works, but stops Vercel from crashing
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running locally on port ${PORT}`);
  });
}