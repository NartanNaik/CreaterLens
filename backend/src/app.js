import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import attributeRoutes from "./routes/attributeRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import stagingRoutes from "./routes/stagingRoutes.js";
import { initializeBloomFilter } from "./services/bloomFilterService.js";

dotenv.config();

const app = express();

// Required for express-rate-limit to accurately identify IPs behind proxies (like Vercel, Render, or Heroku)
app.set("trust proxy", 1);

// 1. Wide-open CORS configuration. This allows ALL apps (Flutter, React, Postman) to connect without being blocked.
app.use(cors());

app.use(express.json());

// Initialize the Bloom Filter in the background to warm up the cache
initializeBloomFilter().catch(console.error);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Pink Data API is running."
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/attributes", attributeRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/staging", stagingRoutes);

// Fallback for 404 Route Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

export default app;