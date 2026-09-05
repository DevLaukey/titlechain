import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { KycStatus } from "@title-chain/shared";

const prisma = new PrismaClient();

export interface SubmitKycInput {
  userId: string;
  documentType: string;
  documentHash: string;
}

export const identityService = {
  async submitKyc(input: SubmitKycInput) {
    const existingRecord = await prisma.kycRecord.findFirst({
      where: {
        userId: input.userId,
        status: { in: ["PENDING", "VERIFIED"] as never[] },
      },
    });

    if (existingRecord?.status === "VERIFIED") {
      throw new AppError("Identity is already verified", 409);
    }

    if (existingRecord?.status === "PENDING") {
      throw new AppError(
        "A KYC review is already in progress. Please wait for the current review to complete.",
        409
      );
    }

    const record = await prisma.kycRecord.create({
      data: {
        userId: input.userId,
        documentType: input.documentType,
        documentHash: input.documentHash,
        status: "PENDING" as never,
      },
    });

    await prisma.user.update({
      where: { id: input.userId },
      data: { kycStatus: "PENDING" as never },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "KycRecord",
        entityId: record.id,
        action: "KYC_SUBMITTED",
        actorId: input.userId,
        metadata: {
          documentType: input.documentType,
          documentHash: input.documentHash,
        },
      },
    });

    return record;
  },

  async getKycStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        kycStatus: true,
        kycRecords: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            documentType: true,
            status: true,
            notes: true,
            createdAt: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return {
      userId: user.id,
      kycStatus: user.kycStatus as unknown as KycStatus,
      latestRecord: user.kycRecords[0] ?? null,
    };
  },

  async verifyKyc(kycRecordId: string, registrarId: string, notes?: string) {
    const record = await prisma.kycRecord.findUnique({
      where: { id: kycRecordId },
    });

    if (!record) {
      throw new AppError("KYC record not found", 404);
    }

    const updatedRecord = await prisma.kycRecord.update({
      where: { id: kycRecordId },
      data: {
        status: "VERIFIED" as never,
        notes,
        verifiedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: record.userId },
      data: { kycStatus: "VERIFIED" as never },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "KycRecord",
        entityId: kycRecordId,
        action: "KYC_VERIFIED",
        actorId: registrarId,
        metadata: { notes },
      },
    });

    return updatedRecord;
  },

  async rejectKyc(kycRecordId: string, registrarId: string, notes: string) {
    const record = await prisma.kycRecord.findUnique({
      where: { id: kycRecordId },
    });

    if (!record) {
      throw new AppError("KYC record not found", 404);
    }

    const updatedRecord = await prisma.kycRecord.update({
      where: { id: kycRecordId },
      data: {
        status: "REJECTED" as never,
        notes,
      },
    });

    await prisma.user.update({
      where: { id: record.userId },
      data: { kycStatus: "REJECTED" as never },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "KycRecord",
        entityId: kycRecordId,
        action: "KYC_REJECTED",
        actorId: registrarId,
        metadata: { notes },
      },
    });

    return updatedRecord;
  },
};
