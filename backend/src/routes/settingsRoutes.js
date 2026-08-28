import express from 'express';
import { getColumns, addColumn, deleteColumn } from '../controllers/settingsController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Apply auth middleware to all settings routes
router.use(verifyToken);

// Security: Rate limiting for schema modifications to prevent abuse or accidental spam
const schemaLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15-minute window
    max: 30, // Limit each IP to 30 schema modifications per window
    message: {
        success: false,
        error: "Too many schema modifications from this IP. Please wait before adding or deleting more columns."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

router.get('/columns', getColumns);

// Apply the schema limiter to destructive/creation routes
router.post('/columns', schemaLimiter, addColumn);
router.delete('/columns', schemaLimiter, deleteColumn);

export default router;