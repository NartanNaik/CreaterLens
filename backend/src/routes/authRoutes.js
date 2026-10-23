import { Router } from "express";
import rateLimit from "express-rate-limit";
import { googleLogin, refreshTokenController } from "../controllers/authController.js";
import { googleAuthLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Security: Rate limiting for silent token refreshes (web interceptor and Flutter app)
const refreshLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: "Too many session refreshes. Please wait a minute."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security: Rate limiting to prevent bot spam on Google Auth
router.post("/google", googleAuthLimiter, googleLogin);

// Endpoint for silently refreshing tokens via the Axios interceptor and the Flutter app
router.post("/refresh", refreshLimiter, refreshTokenController);

export default router;