import express from 'express';
import { 
    shareReelController, 
    getStagingQueueController, 
    processStagingItemController, 
    deleteStagingItemController,
    approveStagingItemController,
    bulkApproveStagingItemsController,
    bulkDeleteStagingItemsController,
    bulkImportStagingItemsController
} from '../controllers/stagingController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Apply authentication to all staging routes
router.use(verifyToken);

// Security: Rate limit incoming shares to prevent spamming
const shareLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: "Too many reels shared recently. Please wait a moment."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security: Rate limit on AI processing to protect quotas
const aiProcessLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30, // Increased to 30 to accommodate dual-step scrape & analyze calls
    message: {
        success: false,
        error: "AI processing limit reached. Please wait 60 seconds."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- BULK & INGESTION ROUTES (Must be defined before parameterized /:id routes) ---
router.post('/share', shareLimiter, shareReelController);
router.post('/bulk-import', bulkImportStagingItemsController);
router.post('/bulk-approve', bulkApproveStagingItemsController);
router.post('/bulk-delete', bulkDeleteStagingItemsController);

// --- QUEUE FETCH ROUTE ---
router.get('/', getStagingQueueController);

// --- INDIVIDUAL ITEM ACTION ROUTES ---
// AI processing pipeline
router.post('/:id/process', aiProcessLimiter, processStagingItemController);

// Individual item approval
router.post('/:id/approve', approveStagingItemController);

// Discard/delete item
router.delete('/:id', deleteStagingItemController);

// --- CATCH-ALL ROUTE SAFETY FALLBACK ---
// If frontend calls POST /:id directly or with trailing slashes, prevent raw Express 404s
router.post('/:id', (req, res, next) => {
    const { action } = req.query;
    if (action === 'approve') return approveStagingItemController(req, res, next);
    if (action === 'process') return processStagingItemController(req, res, next);
    return res.status(200).json({ 
        success: true, 
        message: "No-op. Item already dispatched." 
    });
});

export default router;