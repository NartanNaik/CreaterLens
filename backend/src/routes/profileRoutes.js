import express from 'express';
// Add deleteProfile to the import
import { checkProfile, addProfile, getProfiles, updateProfile, deleteProfile, massUpload } from '../controllers/profileController.js';
import { verifyToken } from '../middleware/authMiddleware.js'; 

const router = express.Router();

router.use(verifyToken); 

router.post('/check', checkProfile);
router.post('/add', addProfile);
router.get('/', getProfiles);
router.post('/mass-upload', massUpload);
router.patch('/:id', updateProfile);

// The new DELETE route
router.delete('/:id', deleteProfile); 

export default router;