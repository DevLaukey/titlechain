import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { aiService } from "../services/ai.service";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse } from "@title-chain/shared";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const documentIdSchema = z.object({
  documentId: z.string().uuid("documentId must be a valid UUID"),
});

export const aiController = {
  /**
   * POST /api/ai/analyze/:documentId
   * Triggers AI analysis (OCR + fraud detection + risk scoring) for a document.
   * Auth required.
   */
  async analyzeDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const params = documentIdSchema.safeParse(req.params);
      if (!params.success) {
        const response: ApiResponse = {
          success: false,
          error: params.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; "),
        };
        return res.status(400).json(response);
      }

      const result = await aiService.analyzeDocument(params.data.documentId);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: "Document analysed successfully",
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/ai/analysis/:documentId
   * Returns the current AI analysis fields for a document.
   * Auth required.
   */
  async getAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const params = documentIdSchema.safeParse(req.params);
      if (!params.success) {
        const response: ApiResponse = {
          success: false,
          error: params.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join("; "),
        };
        return res.status(400).json(response);
      }

      const document = await prisma.propertyDocument.findUnique({
        where: { id: params.data.documentId },
        select: {
          id: true,
          propertyId: true,
          documentType: true,
          fileName: true,
          aiVerified: true,
          fraudScore: true,
          riskScore: true,
          ocrText: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!document) {
        throw new AppError("Document not found", 404);
      }

      const response: ApiResponse<typeof document> = {
        success: true,
        data: document,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/ai/analyze-pending
   * Runs AI analysis on all documents where aiVerified = false.
   * ADMIN only.
   */
  async analyzeAllPending(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await aiService.analyzeAllPendingDocuments();

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: `Batch analysis complete: ${result.processed} processed, ${result.failed} failed`,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
};
