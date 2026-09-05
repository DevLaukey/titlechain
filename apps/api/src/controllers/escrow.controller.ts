import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { escrowService } from "../services/escrow.service";
import { transactionService } from "../services/transaction.service";
import { ApiResponse, UserRole } from "@title-chain/shared";
import { AppError } from "../middleware/errorHandler";

const milestoneSchema = z.object({
  description: z.string().min(1, "Milestone description is required"),
  amount: z.number().positive("Milestone amount must be positive"),
});

const createEscrowSchema = z.object({
  transactionId: z.string().uuid("Transaction ID must be a valid UUID"),
  amount: z.number().positive("Total escrow amount must be positive"),
  milestones: z
    .array(milestoneSchema)
    .min(1, "At least one milestone is required"),
});

export const escrowController = {
  async createEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createEscrowSchema.parse(req.body);
      const actorId = req.user!.id;
      const userRole = req.user!.role;

      // If BUYER, verify they are the buyer of the transaction
      if (userRole === UserRole.BUYER) {
        const transaction = await transactionService.getTransactionById(
          body.transactionId
        );
        if (transaction.buyerId !== actorId) {
          throw new AppError(
            "You are not the buyer of this transaction",
            403
          );
        }
      }

      const escrow = await escrowService.createEscrow(body);

      const response: ApiResponse<typeof escrow> = {
        success: true,
        data: escrow,
        message: "Escrow created successfully",
      };
      res.status(201).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const response: ApiResponse = {
          success: false,
          error: err.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; "),
        };
        return res.status(400).json(response);
      }
      next(err);
    }
  },

  async getEscrowByTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const escrow = await escrowService.getEscrowByTransactionId(transactionId);

      const response: ApiResponse<typeof escrow> = {
        success: true,
        data: escrow,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  async fundEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorId = req.user!.id;
      const userRole = req.user!.role;

      // BUYER may only fund an escrow tied to their own transaction
      if (userRole === UserRole.BUYER) {
        const existing = await escrowService.getEscrowById(id);
        if (existing.transaction.buyerId !== actorId) {
          throw new AppError(
            "You are not the buyer of this transaction",
            403
          );
        }
      }

      const escrow = await escrowService.fundEscrow(id, actorId);

      const response: ApiResponse<typeof escrow> = {
        success: true,
        data: escrow,
        message: "Escrow marked as funded",
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  async releaseMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, index } = req.params;
      const milestoneIndex = parseInt(index, 10);
      const actorId = req.user!.id;

      if (isNaN(milestoneIndex) || milestoneIndex < 0) {
        throw new AppError(
          "Milestone index must be a non-negative integer",
          400
        );
      }

      const escrow = await escrowService.releaseMilestone(
        id,
        milestoneIndex,
        actorId
      );

      const response: ApiResponse<typeof escrow> = {
        success: true,
        data: escrow,
        message: `Milestone ${milestoneIndex} released successfully`,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  async refundEscrow(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorId = req.user!.id;

      const escrow = await escrowService.refundEscrow(id, actorId);

      const response: ApiResponse<typeof escrow> = {
        success: true,
        data: escrow,
        message: "Escrow refunded successfully",
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
};
