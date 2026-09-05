import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";
import identityRoutes from "./identity.routes";
import propertyRoutes from "./property.routes";
import { propertyDocumentRouter, documentRouter } from "./document.routes";
import aiRoutes from "./ai.routes";
import transactionRoutes from "./transaction.routes";
import escrowRoutes from "./escrow.routes";
import workflowRoutes from "./workflow.routes";
import blockchainRoutes from "./blockchain.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/identity", identityRoutes);
router.use("/property", propertyRoutes);
router.use("/property", propertyDocumentRouter);
router.use("/documents", documentRouter);
router.use("/ai", aiRoutes);
router.use("/transactions", transactionRoutes);
router.use("/escrow", escrowRoutes);
router.use("/workflow", workflowRoutes);
router.use("/blockchain", blockchainRoutes);

export default router;
