import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { propertyService } from "../services/property.service";
import { ApiResponse, PaginatedResponse } from "@title-chain/shared";

const createPropertySchema = z.object({
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2),
  postalCode: z.string().optional(),
  landArea: z.number().positive().optional(),
  landAreaUnit: z.enum(["sqm", "sqft", "acres", "hectares"]).optional(),
  propertyType: z.enum([
    "RESIDENTIAL",
    "COMMERCIAL",
    "INDUSTRIAL",
    "AGRICULTURAL",
    "MIXED_USE",
  ]),
  estimatedValue: z.number().positive().optional(),
});

const updatePropertySchema = createPropertySchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z
    .enum([
      "DRAFT",
      "PENDING_REVIEW",
      "APPROVED",
      "REJECTED",
      "TRANSFERRED",
    ])
    .optional(),
  ownerId: z.string().uuid().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const propertyController = {
  async createProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createPropertySchema.parse(req.body);
      const ownerId = req.user!.id;

      const property = await propertyService.createProperty({
        ...body,
        ownerId,
      });

      const response: ApiResponse<typeof property> = {
        success: true,
        data: property,
        message: "Property registered successfully",
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

  async listProperties(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listQuerySchema.parse(req.query);
      const result = await propertyService.listProperties(query);

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

  async getProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const property = await propertyService.getPropertyById(id);

      const response: ApiResponse<typeof property> = {
        success: true,
        data: property,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  async updateProperty(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const body = updatePropertySchema.parse(req.body);
      const requesterId = req.user!.id;

      const property = await propertyService.updateProperty(
        id,
        requesterId,
        body
      );

      const response: ApiResponse<typeof property> = {
        success: true,
        data: property,
        message: "Property updated successfully",
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
};
