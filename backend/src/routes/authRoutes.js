import { Router } from "express";
import { googleLogin, refreshTokenController } from "../controllers/authController.js";
import { googleAuthLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Security: Rate limiting to prevent bot spam on Google Auth
// Applies the limiter middleware before passing to the controller
router.post("/google", googleAuthLimiter, googleLogin);

// Endpoint for silently refreshing tokens via Axios interceptor
router.post("/refresh", refreshTokenController);

export default router;