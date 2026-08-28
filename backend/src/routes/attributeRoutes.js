import { Router } from "express";
import {
  updateNationController,
  dragFillNationController,
  updateInterestController,
  updateStatusController,
  updateNotesController,
  bulkUpdateAttributeController
} from "../controllers/attributeController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateAttribute } from "../middleware/validateAttribute.js";

const router = Router();

router.put(
  "/nation/:id",
  authMiddleware,
  updateNationController
);

router.put(
  "/nation/drag-fill",
  authMiddleware,
  dragFillNationController
);

router.put(
  "/interest/:id",
  authMiddleware,
  updateInterestController
);

router.put(
  "/status/:id",
  authMiddleware,
  updateStatusController
);

router.put(
  "/notes/:id",
  authMiddleware,
  updateNotesController
);

// Apply the validation middleware to protect dynamic column bulk updates
router.put(
  "/bulk-update",
  authMiddleware,
  validateAttribute,
  bulkUpdateAttributeController
);

export default router;