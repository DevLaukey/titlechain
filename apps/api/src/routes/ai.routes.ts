import { Router } from "express";
import { aiController } from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();

router.post("/analyze/:documentId", authenticate, aiController.analyzeDocument);
router.get("/analysis/:documentId", authenticate, aiController.getAnalysis);
router.post(
  "/analyze-pending",
  authenticate,
  requireRole(["ADMIN"]),
  aiController.analyzeAllPending
);

export default router;
