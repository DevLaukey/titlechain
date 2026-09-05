import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { blockchainService } from "../services/blockchain.service";
import { ApiResponse } from "@title-chain/shared";

// ─── Validation schemas ───────────────────────────────────────────────────────

const registerPropertySchema = z.object({
  titleNumber: z.string().min(1, "titleNumber is required"),
  metadataHash: z.string().min(1, "metadataHash is required"),
  ownerWalletAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "ownerWalletAddress must be a valid Ethereum address"),
});

const transferPropertySchema = z.object({
  onChainId: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "onChainId must be a valid bytes32 hex string"),
  newOwnerWalletAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "newOwnerWalletAddress must be a valid Ethereum address"),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const blockchainController = {
  /**
   * POST /api/blockchain/property/register
   * Registers a property on-chain.
   * Requires ADMIN or REGISTRAR role.
   */
  async registerProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = registerPropertySchema.parse(req.body);

      const result = await blockchainService.registerPropertyOnChain(
        body.titleNumber,
        body.metadataHash,
        body.ownerWalletAddress
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: "Property registered on-chain successfully",
      };
      res.status(201).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const response: ApiResponse = {
          success: false,
          error: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        };
        res.status(400).json(response);
        return;
      }
      next(err);
    }
  },

  /**
   * POST /api/blockchain/property/transfer
   * Transfers property ownership on-chain.
   * Requires ADMIN or REGISTRAR role.
   */
  async transferProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = transferPropertySchema.parse(req.body);

      const result = await blockchainService.transferPropertyOnChain(
        body.onChainId,
        body.newOwnerWalletAddress
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: "Property ownership transferred on-chain successfully",
      };
      res.status(200).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const response: ApiResponse = {
          success: false,
          error: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        };
        res.status(400).json(response);
        return;
      }
      next(err);
    }
  },

  /**
   * GET /api/blockchain/property/:onChainId
   * Reads an on-chain property record. Public.
   */
  async getProperty(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { onChainId } = req.params;

      const property = await blockchainService.getPropertyFromChain(onChainId);

      const response: ApiResponse<typeof property> = {
        success: true,
        data: property,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/blockchain/identity/:walletAddress
   * Returns whether a wallet address has a verified on-chain identity. Public.
   */
  async verifyIdentity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { walletAddress } = req.params;

      const isVerified = await blockchainService.verifyIdentityOnChain(walletAddress);

      const response: ApiResponse<{ walletAddress: string; isVerified: boolean }> = {
        success: true,
        data: { walletAddress, isVerified },
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/blockchain/health
   * Returns the blockchain service connection status. Public.
   * Never throws — always returns a valid status object.
   */
  async healthCheck(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await blockchainService.healthCheck();

      const response: ApiResponse<typeof health> = {
        success: true,
        data: health,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
};
