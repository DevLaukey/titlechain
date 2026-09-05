import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { workflowService } from "../services/workflow.service";
import { transactionService } from "../services/transaction.service";
import { ApiResponse, UserRole } from "@title-chain/shared";
import { AppError } from "../middleware/errorHandler";

const approveSchema = z.object({
  notes: z.string().optional(),
});

const rejectSchema = z.object({
  notes: z.string().min(1, "Rejection notes are required"),
});

export const workflowController = {
  async submitForReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const actorId = req.user!.id;
      const userRole = req.user!.role;

      // SELLER must be the actual seller of the transaction
      if (userRole === UserRole.SELLER) {
        const transaction = await transactionService.getTransactionById(
          transactionId
        );
        if (transaction.sellerId !== actorId) {
          throw new AppError(
            "You are not the seller of this transaction",
            403
          );
        }
      }

      const transaction = await workflowService.submitForGovernmentReview(
        transactionId,
        actorId
      );

      const response: ApiResponse<typeof transaction> = {
        success: true,
        data: transaction,
        message: "Transaction submitted for government review",
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  async getPendingApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const transactions = await workflowService.getPendingApprovals();

      const response: ApiResponse<typeof transactions> = {
        success: true,
        data: transactions,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  async approveTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const body = approveSchema.parse(req.body);
      const registrarId = req.user!.id;

      const result = await workflowService.approveTransaction(
        transactionId,
        registrarId,
        body.notes
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: "Transaction approved successfully",
      };
      res.status(200).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const response: ApiResponse = {
          success: false,
          error: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        };
        return res.status(400).json(response);
      }
      next(err);
    }
  },

  async rejectTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const body = rejectSchema.parse(req.body);
      const registrarId = req.user!.id;

      const result = await workflowService.rejectTransaction(
        transactionId,
        registrarId,
        body.notes
      );

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: "Transaction rejected",
      };
      res.status(200).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const response: ApiResponse = {
          success: false,
          error: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
        };
        return res.status(400).json(response);
      }
      next(err);
    }
  },

  async getApprovalHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId } = req.params;
      const approvals = await workflowService.getApprovalHistory(transactionId);

      const response: ApiResponse<typeof approvals> = {
        success: true,
        data: approvals,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
};
