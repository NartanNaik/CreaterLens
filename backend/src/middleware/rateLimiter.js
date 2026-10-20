import rateLimit from 'express-rate-limit';

// Rate limiter specifically for the Google Auth endpoint
// Prevents bots from spamming fake Google accounts to spawn OpenRouter keys
export const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per 15 minutes
  message: {
    success: false,
    error: "Too many login attempts from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});