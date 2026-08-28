import express from 'express';
import { 
    checkProfile, 
    addProfile, 
    getProfiles, 
    updateProfile, 
    deleteProfile, 
    massUpload 
} from '../controllers/profileController.js';
import { verifyToken } from '../middleware/authMiddleware.js'; 
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Apply authentication to all routes in this file
router.use(verifyToken); 

// Security: Prevent database read abuse on single profile checks (Limit: 60 requests per minute)
const checkLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 60,
    message: {
        success: false,
        error: "Too many profile checks from this IP. Please wait a minute."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Security: Prevent Denial of Wallet (DoW) on heavy batch write operations (Limit: 10 requests per minute)
const massUploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: "Mass upload rate limit exceeded. Please wait a minute before uploading more."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Routes
router.post('/check', checkLimiter, checkProfile);
router.post('/add', addProfile);
router.get('/', getProfiles);
router.post('/mass-upload', massUploadLimiter, massUpload);
router.patch('/:id', updateProfile);
router.delete('/:id', deleteProfile); 

export default router;