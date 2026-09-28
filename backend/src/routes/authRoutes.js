import { Router } from "express";
import { loginUser, refreshTokenController } from "../controllers/authController.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Security: Rate limiting to prevent brute-force login attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  message: {
    success: false,
    message: "Too many login attempts from this IP, please try again after 15 minutes."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the limiter middleware before passing to the controller
router.post("/login", loginLimiter, loginUser);

// Endpoint for silently refreshing tokens via Axios interceptor
router.post("/refresh", refreshTokenController);

export default router;