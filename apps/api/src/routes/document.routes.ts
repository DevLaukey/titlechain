import { Router } from "express";
import {
  documentController,
  uploadMiddleware,
} from "../controllers/document.controller";
import { authenticate } from "../middleware/auth";

/**
 * Routes mounted at /api/property:
 *   POST   /api/property/:propertyId/documents  – upload (auth + owner/ADMIN)
 *   GET    /api/property/:propertyId/documents  – list   (auth)
 */
export const propertyDocumentRouter = Router();

propertyDocumentRouter.post(
  "/:propertyId/documents",
  authenticate,
  uploadMiddleware,
  documentController.uploadDocument
);

propertyDocumentRouter.get(
  "/:propertyId/documents",
  authenticate,
  documentController.getPropertyDocuments
);

/**
 * Routes mounted at /api/documents:
 *   GET    /api/documents/:id  – get single (auth)
 */
export const documentRouter = Router();

documentRouter.get("/:id", authenticate, documentController.getDocumentById);
