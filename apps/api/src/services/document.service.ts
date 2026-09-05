import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import { AppError } from "../middleware/errorHandler";

const prisma = new PrismaClient();

export const documentService = {
  async uploadDocument(
    propertyId: string,
    userId: string,
    userRole: string,
    file: Express.Multer.File,
    documentType: string
  ) {
    // Verify property exists
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new AppError("Property not found", 404);
    }

    // Only the property owner or an ADMIN may upload documents
    if (userRole !== "ADMIN" && property.ownerId !== userId) {
      throw new AppError(
        "You do not have permission to upload documents to this property",
        403
      );
    }

    // Compute SHA-256 hash of the file buffer (simulating IPFS hash)
    const ipfsHash = crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");

    const document = await prisma.propertyDocument.create({
      data: {
        propertyId,
        documentType,
        fileName: file.originalname,
        ipfsHash,
        storageUrl: `/uploads/${propertyId}/${file.originalname}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "PropertyDocument",
        entityId: document.id,
        action: "DOCUMENT_UPLOADED",
        actorId: userId,
        propertyId,
        metadata: {
          fileName: file.originalname,
          documentType,
          ipfsHash,
        },
      },
    });

    return document;
  },

  async getPropertyDocuments(propertyId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      throw new AppError("Property not found", 404);
    }

    return prisma.propertyDocument.findMany({
      where: { propertyId },
      orderBy: { createdAt: "desc" },
    });
  },

  async getDocumentById(id: string) {
    const document = await prisma.propertyDocument.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            id: true,
            titleNumber: true,
            address: true,
            ownerId: true,
          },
        },
      },
    });

    if (!document) {
      throw new AppError("Document not found", 404);
    }

    return document;
  },
};
