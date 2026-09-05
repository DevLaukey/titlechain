import { Router } from "express";
import { workflowController } from "../controllers/workflow.controller";
import { authenticate } from "../middleware/auth";
import { rbac } from "../middleware/rbac";
import { UserRole } from "@title-chain/shared";

const router = Router();

// POST /api/workflow/submit/:transactionId — submit for gov review (SELLER or ADMIN)
router.post(
  "/submit/:transactionId",
  authenticate,
  rbac([UserRole.SELLER, UserRole.ADMIN]),
  workflowController.submitForReview
);

// GET /api/workflow/pending — pending approvals queue (REGISTRAR or ADMIN)
router.get(
  "/pending",
  authenticate,
  rbac([UserRole.REGISTRAR, UserRole.ADMIN]),
  workflowController.getPendingApprovals
);

// POST /api/workflow/:transactionId/approve — approve (REGISTRAR or ADMIN)
router.post(
  "/:transactionId/approve",
  authenticate,
  rbac([UserRole.REGISTRAR, UserRole.ADMIN]),
  workflowController.approveTransaction
);

// POST /api/workflow/:transactionId/reject — reject (REGISTRAR or ADMIN; notes required)
router.post(
  "/:transactionId/reject",
  authenticate,
  rbac([UserRole.REGISTRAR, UserRole.ADMIN]),
  workflowController.rejectTransaction
);

// GET /api/workflow/:transactionId/history — approval history (auth required)
router.get(
  "/:transactionId/history",
  authenticate,
  workflowController.getApprovalHistory
);

export default router;
