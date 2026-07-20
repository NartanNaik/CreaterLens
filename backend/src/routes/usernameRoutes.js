import { Router } from "express";
import {
  checkUsernameController,
  addUsernameController,
  getUsernamesController,
  massUploadUsernamesController,
  deleteUsernameController,
  deleteAllUsernamesController,
  updateNationController,
  updateInterestController,
  updateStatusController,
  updateNotesController,
  bulkUpdateAttributeController,
  dragFillNationController
} from "../controllers/usernameController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  getUsernamesController
);

router.post(
  "/check",
  authMiddleware,
  checkUsernameController
);

router.post(
  "/add",
  authMiddleware,
  addUsernameController
);

router.post(
  "/mass-upload",
  authMiddleware,
  massUploadUsernamesController
);

router.put(
  "/nation/drag-fill",
  authMiddleware,
  dragFillNationController
);

router.put(
  "/nation/:id",
  authMiddleware,
  updateNationController
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

router.delete(
  "/:id",
  authMiddleware,
  deleteUsernameController
);

router.delete(
  "/",
  authMiddleware,
  deleteAllUsernamesController
);

export default router;