import express from 'express';
import { 
    checkProfile, 
    addProfile, 
    getProfiles, 
    updateProfile, 
    deleteProfile, 
    massUpload,
    getGlobalCount,
    refreshVideos 
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

// Security: Limit manual adds (Limit: 60 requests per minute)
const addLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: {
        success: false,
        error: "Too many profiles added too quickly. Please wait a minute."
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

// Security: Video refresh can touch many documents (Limit: 5 requests per minute)
const refreshLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: "Too many refresh requests. Please wait a minute."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Routes (fixed paths must stay above the parameterized /:id routes)
router.post('/check', checkLimiter, checkProfile);
router.post('/add', addLimiter, addProfile);

router.get('/count', getGlobalCount); 
router.post('/refresh-videos', refreshLimiter, refreshVideos);

router.get('/', getProfiles);
router.post('/mass-upload', massUploadLimiter, massUpload);
router.patch('/:id', updateProfile);
router.delete('/:id', deleteProfile); 

export default router;