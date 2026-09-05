import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";

const prisma = new PrismaClient();

const transactionWithParties = {
  property: {
    select: { id: true, titleNumber: true, address: true, city: true, state: true, country: true },
  },
  buyer: { select: { id: true, email: true, firstName: true, lastName: true } },
  seller: { select: { id: true, email: true, firstName: true, lastName: true } },
  escrow: { select: { id: true, status: true, amount: true, milestones: true } },
  govApprovals: {
    include: {
      registrar: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

export const workflowService = {
  /**
   * Advance a transaction from ESCROW_FUNDED → GOV_REVIEW.
   * Creates an audit log entry with action GOV_APPROVAL_REQUESTED.
   */
  async submitForGovernmentReview(transactionId: string, actorId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    if ((transaction.status as string) !== "ESCROW_FUNDED") {
      throw new AppError(
        `Transaction must be in ESCROW_FUNDED status to submit for government review. Current status: ${transaction.status}`,
        400
      );
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "GOV_REVIEW" as never },
      include: transactionWithParties,
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Transaction",
        entityId: transactionId,
        action: "GOV_APPROVAL_REQUESTED",
        actorId,
        transactionId,
        metadata: { submittedBy: actorId } as never,
      },
    });

    return updated;
  },

  /**
   * Returns all transactions currently in GOV_REVIEW status.
   * The registrarId parameter is reserved for future filtering by assigned registrar
   * (the Transaction model does not have an assignedRegistrarId field).
   */
  async getPendingApprovals(_registrarId?: string) {
    const transactions = await prisma.transaction.findMany({
      where: { status: "GOV_REVIEW" as never },
      orderBy: { updatedAt: "asc" },
      include: transactionWithParties,
    });

    return transactions;
  },

  /**
   * Approve a transaction: creates a GovApproval record and advances status to APPROVED.
   */
  async approveTransaction(
    transactionId: string,
    registrarId: string,
    notes?: string
  ) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    if ((transaction.status as string) !== "GOV_REVIEW") {
      throw new AppError(
        `Transaction must be in GOV_REVIEW status to approve. Current status: ${transaction.status}`,
        400
      );
    }

    const [approval, updatedTransaction] = await prisma.$transaction([
      prisma.govApproval.create({
        data: {
          transactionId,
          registrarId,
          action: "APPROVED",
          notes: notes ?? null,
        },
        include: {
          registrar: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.transaction.update({
        where: { id: transactionId },
        data: { status: "APPROVED" as never },
        include: transactionWithParties,
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        entityType: "Transaction",
        entityId: transactionId,
        action: "GOV_APPROVAL_GRANTED",
        actorId: registrarId,
        transactionId,
        metadata: { notes: notes ?? null, approvalId: approval.id } as never,
      },
    });

    return { transaction: updatedTransaction, approval };
  },

  /**
   * Reject a transaction: creates a GovApproval record and sets status to CANCELLED.
   * Notes are required for rejection.
   */
  async rejectTransaction(
    transactionId: string,
    registrarId: string,
    notes: string
  ) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    if ((transaction.status as string) !== "GOV_REVIEW") {
      throw new AppError(
        `Transaction must be in GOV_REVIEW status to reject. Current status: ${transaction.status}`,
        400
      );
    }

    const [approval, updatedTransaction] = await prisma.$transaction([
      prisma.govApproval.create({
        data: {
          transactionId,
          registrarId,
          action: "REJECTED",
          notes,
        },
        include: {
          registrar: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.transaction.update({
        where: { id: transactionId },
        data: { status: "CANCELLED" as never },
        include: transactionWithParties,
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        entityType: "Transaction",
        entityId: transactionId,
        action: "GOV_APPROVAL_REJECTED",
        actorId: registrarId,
        transactionId,
        metadata: { notes, approvalId: approval.id } as never,
      },
    });

    return { transaction: updatedTransaction, approval };
  },

  /**
   * Returns all GovApproval records for a transaction, with registrar info included.
   */
  async getApprovalHistory(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    const approvals = await prisma.govApproval.findMany({
      where: { transactionId },
      include: {
        registrar: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return approvals;
  },
};
