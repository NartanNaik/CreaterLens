import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from './routes/profileRoutes.js';
import attributeRoutes from "./routes/attributeRoutes.js";
import settingsRoutes from './routes/settingsRoutes.js';

dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://pink-data.vercel.app", 
  "http://localhost:5173"
].filter(Boolean);

// 1. Extract your exact CORS configuration into a reusable variable
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 2. Apply it to standard requests
app.use(cors(corsOptions));

// 3. Apply it specifically to preflight requests (THE VERCEL FIX!)
app.options('*', cors(corsOptions));

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