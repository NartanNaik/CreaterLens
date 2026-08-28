import express from 'express';
import { 
    shareReelController, 
    getStagingQueueController, 
    processStagingItemController, 
    deleteStagingItemController 
} from '../controllers/stagingController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Apply authentication to all staging routes
router.use(verifyToken);

// Security: Rate limit incoming shares to prevent spamming the Bloom Filter / Firestore
const shareLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Allow up to 100 shared reels per 15 minutes
    message: {
        success: false,
        error: "Too many reels shared recently. Please wait a moment."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security: Strict rate limit on AI processing to protect Gemini API free-tier quotas
const aiProcessLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15, // Max 15 AI processing requests per minute (Matches Gemini Flash Free Tier)
    message: {
        success: false,
        error: "AI processing limit reached. Please wait 60 seconds before analyzing more reels."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Route to receive incoming shared links from mobile/desktop
router.post('/share', shareLimiter, shareReelController);

// Route to fetch all pending items for the UI dashboard
router.get('/', getStagingQueueController);

// Route to trigger the Gemini AI on a specific queued item
router.post('/:id/process', aiProcessLimiter, processStagingItemController);

// Route to discard/delete an item from the queue without saving
router.delete('/:id', deleteStagingItemController);

export default router;