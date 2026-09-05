import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { identityService } from "../services/identity.service";
import { ApiResponse } from "@title-chain/shared";

const submitKycSchema = z.object({
  documentType: z.enum([
    "NATIONAL_ID",
    "PASSPORT",
    "DRIVERS_LICENSE",
    "UTILITY_BILL",
    "BANK_STATEMENT",
  ]),
  documentHash: z
    .string()
    .min(10, "Document hash must be at least 10 characters"),
});

export const identityController = {
  async submitKyc(req: Request, res: Response, next: NextFunction) {
    try {
      const body = submitKycSchema.parse(req.body);
      const userId = req.user!.id;

      const record = await identityService.submitKyc({
        userId,
        documentType: body.documentType,
        documentHash: body.documentHash,
      });

      const response: ApiResponse<typeof record> = {
        success: true,
        data: record,
        message:
          "KYC documents submitted successfully. Your identity is pending review.",
      };
      res.status(201).json(response);
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

  async getKycStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const status = await identityService.getKycStatus(userId);

      const response: ApiResponse<typeof status> = {
        success: true,
        data: status,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
};
