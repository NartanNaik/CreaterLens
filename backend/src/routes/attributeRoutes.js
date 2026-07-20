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

router.put(
  "/bulk-update",
  authMiddleware,
  bulkUpdateAttributeController
);

export default router;