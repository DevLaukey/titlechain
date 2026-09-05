import { Router } from "express";
import { blockchainController } from "../controllers/blockchain.controller";
import { authenticate } from "../middleware/auth";
import { rbac } from "../middleware/rbac";
import { UserRole } from "@title-chain/shared";

const router = Router();

// ── Public endpoints ──────────────────────────────────────────────────────────

/**
 * GET /api/blockchain/health
 * Returns the live connection status of the blockchain service.
 */
router.get("/health", blockchainController.healthCheck);

/**
 * GET /api/blockchain/property/:onChainId
 * Reads a property record directly from the smart contract.
 */
router.get("/property/:onChainId", blockchainController.getProperty);

/**
 * GET /api/blockchain/identity/:walletAddress
 * Checks whether a wallet address has a verified on-chain KYC identity.
 */
router.get("/identity/:walletAddress", blockchainController.verifyIdentity);

// ── Protected endpoints (ADMIN or REGISTRAR only) ─────────────────────────────

/**
 * POST /api/blockchain/property/register
 * Registers a new property on-chain.
 * Body: { titleNumber, metadataHash, ownerWalletAddress }
 */
router.post(
  "/property/register",
  authenticate,
  rbac([UserRole.ADMIN, UserRole.REGISTRAR]),
  blockchainController.registerProperty
);

/**
 * POST /api/blockchain/property/transfer
 * Transfers property ownership on-chain.
 * Body: { onChainId, newOwnerWalletAddress }
 */
router.post(
  "/property/transfer",
  authenticate,
  rbac([UserRole.ADMIN, UserRole.REGISTRAR]),
  blockchainController.transferProperty
);

export default router;
