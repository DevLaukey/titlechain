import { Router } from "express";
import { transactionController } from "../controllers/transaction.controller";
import { authenticate } from "../middleware/auth";
import { rbac } from "../middleware/rbac";
import { UserRole } from "@title-chain/shared";

const router = Router();

// GET /api/transactions — list own transactions (buyer or seller perspective)
router.get("/", authenticate, transactionController.listTransactions);

// GET /api/transactions/:id — get single transaction (auth required, access checked in controller)
router.get("/:id", authenticate, transactionController.getTransaction);

// POST /api/transactions — create (BUYER role required; buyer = authenticated user)
router.post(
  "/",
  authenticate,
  rbac([UserRole.BUYER]),
  transactionController.createTransaction
);

// PATCH /api/transactions/:id/status — update status (REGISTRAR or ADMIN only)
router.patch(
  "/:id/status",
  authenticate,
  rbac([UserRole.REGISTRAR, UserRole.ADMIN]),
  transactionController.updateTransactionStatus
);

export default router;
