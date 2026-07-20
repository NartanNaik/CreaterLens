import { Router } from "express";
import { 
  getUserSettingsController, 
  updateUserSettingsController,
  getGlobalCategoriesController,
  updateGlobalCategoriesController
} from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/settings", authMiddleware, getUserSettingsController);
router.put("/settings", authMiddleware, updateUserSettingsController);

// Global categories (shared across all users)
router.get("/categories", authMiddleware, getGlobalCategoriesController);
router.put("/categories", authMiddleware, updateGlobalCategoriesController);

export default router;