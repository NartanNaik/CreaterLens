import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from './routes/profileRoutes.js';
import attributeRoutes from "./routes/attributeRoutes.js";
import settingsRoutes from './routes/settingsRoutes.js';

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Username Checker API is running."
  });
});

app.use("/api/auth", authRoutes);
app.use('/api/profiles', profileRoutes);
app.use("/api/attributes", attributeRoutes);
app.use('/api/settings', settingsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

export default app;