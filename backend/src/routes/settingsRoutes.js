import express from 'express';
import { getColumns, addColumn, deleteColumn } from '../controllers/settingsController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware
router.use(verifyToken);

router.get('/columns', getColumns);
router.post('/columns', addColumn);
router.delete('/columns', deleteColumn);

export default router;