import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "../middleware/errorHandler";
import { EscrowMilestone } from "@title-chain/shared";

const prisma = new PrismaClient();

export interface MilestoneInput {
  description: string;
  amount: number;
}

export interface CreateEscrowInput {
  transactionId: string;
  amount: number;
  milestones: MilestoneInput[];
}

const escrowInclude = {
  transaction: {
    include: {
      buyer: { select: { id: true, email: true, firstName: true, lastName: true } },
      seller: { select: { id: true, email: true, firstName: true, lastName: true } },
      property: { select: { id: true, titleNumber: true, address: true } },
    },
  },
};

export const escrowService = {
  async createEscrow(data: CreateEscrowInput) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: data.transactionId },
    });

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    // Ensure no escrow already exists for this transaction
    const existing = await prisma.escrow.findUnique({
      where: { transactionId: data.transactionId },
    });

    if (existing) {
      throw new AppError(
        "An escrow already exists for this transaction",
        409
      );
    }

    // Build milestones with generated id, released flag, and releasedAt
    const milestones: EscrowMilestone[] = data.milestones.map((m) => ({
      id: uuidv4(),
      description: m.description,
      amount: String(m.amount),
      released: false,
      releasedAt: null,
    }));

    const escrow = await prisma.escrow.create({
      data: {
        transactionId: data.transactionId,
        amount: data.amount,
        status: "CREATED" as never,
        milestones: milestones as never,
      },
      include: escrowInclude,
    });

    // Advance transaction status to ESCROW_FUNDED
    await prisma.transaction.update({
      where: { id: data.transactionId },
      data: { status: "ESCROW_FUNDED" as never },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Escrow",
        entityId: escrow.id,
        action: "ESCROW_CREATED",
        actorId: transaction.buyerId,
        transactionId: data.transactionId,
        metadata: {
          amount: data.amount,
          milestoneCount: milestones.length,
        } as never,
      },
    });

    return escrow;
  },

  async getEscrowByTransactionId(transactionId: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { transactionId },
      include: escrowInclude,
    });

    if (!escrow) {
      throw new AppError("Escrow not found for this transaction", 404);
    }

    return escrow;
  },

  async getEscrowById(escrowId: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: escrowInclude,
    });

    if (!escrow) {
      throw new AppError("Escrow not found", 404);
    }

    return escrow;
  },

  async fundEscrow(escrowId: string, actorId: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) {
      throw new AppError("Escrow not found", 404);
    }

    if ((escrow.status as string) !== "CREATED") {
      throw new AppError(
        `Escrow cannot be funded in its current status: ${escrow.status}`,
        400
      );
    }

    const updated = await prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: "FUNDED" as never,
        fundedAt: new Date(),
      },
      include: escrowInclude,
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Escrow",
        entityId: escrowId,
        action: "ESCROW_FUNDED",
        actorId,
        transactionId: escrow.transactionId,
        metadata: { escrowId } as never,
      },
    });

    return updated;
  },

  async releaseMilestone(
    escrowId: string,
    milestoneIndex: number,
    actorId: string
  ) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
    });

    if (!escrow) {
      throw new AppError("Escrow not found", 404);
    }

    const currentStatus = escrow.status as string;
    if (currentStatus !== "FUNDED" && currentStatus !== "PARTIALLY_RELEASED") {
      throw new AppError(
        `Milestones can only be released when escrow is FUNDED or PARTIALLY_RELEASED. Current status: ${currentStatus}`,
        400
      );
    }

    const milestones = escrow.milestones as unknown as EscrowMilestone[];

    if (milestoneIndex < 0 || milestoneIndex >= milestones.length) {
      throw new AppError(
        `Invalid milestone index ${milestoneIndex}. Valid range: 0–${milestones.length - 1}`,
        400
      );
    }

    if (milestones[milestoneIndex].released) {
      throw new AppError(
        `Milestone at index ${milestoneIndex} has already been released`,
        400
      );
    }

    // Mark the milestone as released
    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      released: true,
      releasedAt: new Date().toISOString(),
    };

    const allReleased = milestones.every((m) => m.released);

    const updated = await prisma.escrow.update({
      where: { id: escrowId },
      data: {
        milestones: milestones as never,
        status: allReleased ? ("COMPLETED" as never) : ("PARTIALLY_RELEASED" as never),
        completedAt: allReleased ? new Date() : undefined,
      },
      include: escrowInclude,
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Escrow",
        entityId: escrowId,
        action: "ESCROW_MILESTONE_RELEASED",
        actorId,
        transactionId: escrow.transactionId,
        metadata: {
          milestoneIndex,
          milestoneId: milestones[milestoneIndex].id,
          allReleased,
        } as never,
      },
    });

    if (allReleased) {
      await prisma.auditLog.create({
        data: {
          entityType: "Escrow",
          entityId: escrowId,
          action: "ESCROW_COMPLETED",
          actorId,
          transactionId: escrow.transactionId,
          metadata: { escrowId } as never,
        },
      });
    }

    return updated;
  },

  async refundEscrow(escrowId: string, actorId: string) {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { transaction: true },
    });

    if (!escrow) {
      throw new AppError("Escrow not found", 404);
    }

    if ((escrow.transaction.status as string) !== "CANCELLED") {
      throw new AppError(
        "Refund is only allowed when the associated transaction is CANCELLED",
        400
      );
    }

    const updated = await prisma.escrow.update({
      where: { id: escrowId },
      data: { status: "REFUNDED" as never },
      include: escrowInclude,
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Escrow",
        entityId: escrowId,
        action: "ESCROW_REFUNDED",
        actorId,
        transactionId: escrow.transactionId,
        metadata: { escrowId } as never,
      },
    });

    return updated;
  },

  async getEscrowMilestones(escrowId: string): Promise<EscrowMilestone[]> {
    const escrow = await prisma.escrow.findUnique({
      where: { id: escrowId },
      select: { milestones: true },
    });

    if (!escrow) {
      throw new AppError("Escrow not found", 404);
    }

    return escrow.milestones as unknown as EscrowMilestone[];
  },
};
