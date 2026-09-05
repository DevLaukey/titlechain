import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { transactionService } from "../services/transaction.service";
import { ApiResponse, PaginatedResponse, TransactionStatus, UserRole } from "@title-chain/shared";
import { AppError } from "../middleware/errorHandler";

const createTransactionSchema = z.object({
  propertyId: z.string().uuid("Property ID must be a valid UUID"),
  sellerId: z.string().uuid("Seller ID must be a valid UUID"),
  salePrice: z.number().positive("Sale price must be a positive number"),
  currency: z.string().length(3, "Currency must be a 3-letter code").toUpperCase().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(TransactionStatus).optional(),
  role: z.enum(["buyer", "seller"]).optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(TransactionStatus, {
    errorMap: () => ({ message: "Invalid transaction status" }),
  }),
});

export const transactionController = {
  async createTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createTransactionSchema.parse(req.body);
      const buyerId = req.user!.id;

      const transaction = await transactionService.createTransaction({
        ...body,
        buyerId,
      });

      const response: ApiResponse<typeof transaction> = {
        success: true,
        data: transaction,
        message: "Transaction initiated successfully",
      };
      res.status(201).json(response);
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

  async listTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listQuerySchema.parse(req.query);
      const userId = req.user!.id;

      const result = await transactionService.getUserTransactions(userId, query);

      const response: PaginatedResponse<(typeof result.data)[number]> = {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
      res.status(200).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const response: ApiResponse = {
          success: false,
          error: err.errors.map((e) => e.message).join(", "),
        };
        return res.status(400).json(response);
      }
      next(err);
    }
  },

  async getTransaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const transaction = await transactionService.getTransactionById(id);

      const userId = req.user!.id;
      const userRole = req.user!.role;

      const isParty =
        transaction.buyerId === userId || transaction.sellerId === userId;
      const isPrivileged =
        userRole === UserRole.REGISTRAR || userRole === UserRole.ADMIN;

      if (!isParty && !isPrivileged) {
        throw new AppError(
          "You do not have access to this transaction",
          403
        );
      }

      const response: ApiResponse<typeof transaction> = {
        success: true,
        data: transaction,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  async updateTransactionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const body = updateStatusSchema.parse(req.body);
      const actorId = req.user!.id;

      const transaction = await transactionService.updateTransactionStatus(
        id,
        body.status,
        actorId
      );

      const response: ApiResponse<typeof transaction> = {
        success: true,
        data: transaction,
        message: "Transaction status updated successfully",
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
};
