import { Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { documentService } from "../services/document.service";
import { AppError } from "../middleware/errorHandler";
import { ApiResponse } from "@title-chain/shared";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          "Invalid file type. Allowed types: PDF, JPG, PNG, WebP",
          400
        ) as unknown as null,
        false
      );
    }
  },
});

/**
 * Multer single-file middleware wrapped so that MulterError and custom
 * fileFilter errors are forwarded to Express's error handler.
 */
export function uploadMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  multerUpload.single("file")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof MulterError) {
      return next(
        new AppError(
          err.code === "LIMIT_FILE_SIZE"
            ? "File size exceeds the 10 MB limit"
            : err.message,
          400
        )
      );
    }
    return next(err);
  });
}

export const documentController = {
  async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError("No file provided", 400);
      }

      const { propertyId } = req.params;
      const { documentType } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role as string;

      if (!documentType) {
        throw new AppError("documentType is required", 400);
      }

      const document = await documentService.uploadDocument(
        propertyId,
        userId,
        userRole,
        req.file,
        documentType
      );

      const response: ApiResponse<typeof document> = {
        success: true,
        data: document,
        message: "Document uploaded successfully",
      };
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  },

  async getPropertyDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { propertyId } = req.params;
      const documents = await documentService.getPropertyDocuments(propertyId);

      const response: ApiResponse<typeof documents> = {
        success: true,
        data: documents,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },

  async getDocumentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const document = await documentService.getDocumentById(id);

      const response: ApiResponse<typeof document> = {
        success: true,
        data: document,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
};
