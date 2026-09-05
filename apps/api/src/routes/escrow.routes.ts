import { Router } from "express";
import { escrowController } from "../controllers/escrow.controller";
import { authenticate } from "../middleware/auth";
import { rbac } from "../middleware/rbac";
import { UserRole } from "@title-chain/shared";

const router = Router();

// POST /api/escrow — create escrow (BUYER or ADMIN; buyer ownership checked in controller)
router.post(
  "/",
  authenticate,
  rbac([UserRole.BUYER, UserRole.ADMIN]),
  escrowController.createEscrow
);

// GET /api/escrow/transaction/:transactionId — get escrow by transaction (auth required)
router.get(
  "/transaction/:transactionId",
  authenticate,
  escrowController.getEscrowByTransaction
);

// POST /api/escrow/:id/fund — mark as funded (ADMIN or BUYER; buyer ownership checked in controller)
router.post(
  "/:id/fund",
  authenticate,
  rbac([UserRole.BUYER, UserRole.ADMIN]),
  escrowController.fundEscrow
);

// POST /api/escrow/:id/milestone/:index/release — release a milestone (REGISTRAR or ADMIN)
router.post(
  "/:id/milestone/:index/release",
  authenticate,
  rbac([UserRole.REGISTRAR, UserRole.ADMIN]),
  escrowController.releaseMilestone
);

// POST /api/escrow/:id/refund — refund escrow (ADMIN or REGISTRAR)
router.post(
  "/:id/refund",
  authenticate,
  rbac([UserRole.ADMIN, UserRole.REGISTRAR]),
  escrowController.refundEscrow
);

export default router;
