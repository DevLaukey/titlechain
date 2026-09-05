import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/errorHandler";
import { TransactionStatus } from "@title-chain/shared";

const prisma = new PrismaClient();

// Valid forward-and-cancel transitions for each status
const VALID_TRANSITIONS: Record<string, string[]> = {
  INITIATED: ["AI_REVIEW", "CANCELLED"],
  AI_REVIEW: ["ESCROW_FUNDED", "CANCELLED"],
  ESCROW_FUNDED: ["GOV_REVIEW", "CANCELLED"],
  GOV_REVIEW: ["APPROVED", "CANCELLED"],
  APPROVED: ["TRANSFER_COMPLETE", "CANCELLED"],
  TRANSFER_COMPLETE: [],
  CANCELLED: [],
};

export interface CreateTransactionInput {
  propertyId: string;
  buyerId: string;
  sellerId: string;
  salePrice: number;
  currency?: string;
}

export interface ListTransactionsQuery {
  page?: number;
  limit?: number;
  status?: TransactionStatus;
  buyerId?: string;
  sellerId?: string;
  propertyId?: string;
}

export interface GetUserTransactionsQuery {
  page?: number;
  limit?: number;
  role?: "buyer" | "seller";
}

const transactionInclude = {
  property: {
    select: { id: true, titleNumber: true, address: true, city: true, state: true, country: true },
  },
  buyer: { select: { id: true, email: true, firstName: true, lastName: true, walletAddress: true } },
  seller: { select: { id: true, email: true, firstName: true, lastName: true, walletAddress: true } },
  escrow: true,
  govApprovals: {
    include: {
      registrar: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

export const transactionService = {
  async createTransaction(data: CreateTransactionInput) {
    // Validate property exists and is in APPROVED status
    const property = await prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property) {
      throw new AppError("Property not found", 404);
    }

    if ((property.status as string) !== "APPROVED") {
      throw new AppError(
        `Property must be in APPROVED status to initiate a transaction. Current status: ${property.status}`,
        400
      );
    }

    // Validate buyer and seller are different users
    if (data.buyerId === data.sellerId) {
      throw new AppError("Buyer and seller cannot be the same user", 400);
    }

    // Validate no active transaction already exists for this property
    const existing = await prisma.transaction.findFirst({
      where: {
        propertyId: data.propertyId,
        status: { notIn: ["CANCELLED", "TRANSFER_COMPLETE"] as never[] },
      },
    });

    if (existing) {
      throw new AppError(
        "An active transaction already exists for this property",
        409
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        propertyId: data.propertyId,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        salePrice: data.salePrice,
        currency: data.currency ?? "USD",
        status: "INITIATED" as never,
      },
      include: transactionInclude,
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Transaction",
        entityId: transaction.id,
        action: "TRANSACTION_INITIATED",
        actorId: data.buyerId,
        transactionId: transaction.id,
        propertyId: data.propertyId,
        metadata: {
          salePrice: data.salePrice,
          currency: data.currency ?? "USD",
        } as never,
      },
    });

    return transaction;
  },

  async getTransactionById(id: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: transactionInclude,
    });

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    return transaction;
  },

  async listTransactions(query: ListTransactionsQuery = {}) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.buyerId) where.buyerId = query.buyerId;
    if (query.sellerId) where.sellerId = query.sellerId;
    if (query.propertyId) where.propertyId = query.propertyId;

    const whereClause = where as never;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          property: {
            select: { id: true, titleNumber: true, address: true, city: true },
          },
          buyer: { select: { id: true, email: true, firstName: true, lastName: true } },
          seller: { select: { id: true, email: true, firstName: true, lastName: true } },
          escrow: { select: { id: true, status: true, amount: true } },
        },
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getUserTransactions(userId: string, query: GetUserTransactionsQuery = {}) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    let whereClause: Record<string, unknown>;

    if (query.role === "buyer") {
      whereClause = { buyerId: userId };
    } else if (query.role === "seller") {
      whereClause = { sellerId: userId };
    } else {
      whereClause = { OR: [{ buyerId: userId }, { sellerId: userId }] };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: whereClause as never,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          property: {
            select: { id: true, titleNumber: true, address: true, city: true },
          },
          buyer: { select: { id: true, email: true, firstName: true, lastName: true } },
          seller: { select: { id: true, email: true, firstName: true, lastName: true } },
          escrow: { select: { id: true, status: true, amount: true } },
        },
      }),
      prisma.transaction.count({ where: whereClause as never }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async updateTransactionStatus(
    id: string,
    newStatus: TransactionStatus,
    actorId: string
  ) {
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    const currentStatus = transaction.status as string;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(newStatus as string)) {
      throw new AppError(
        `Invalid status transition: ${currentStatus} → ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
        400
      );
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: { status: newStatus as never },
      include: transactionInclude,
    });

    await prisma.auditLog.create({
      data: {
        entityType: "Transaction",
        entityId: id,
        action: "TRANSACTION_STATUS_UPDATED",
        actorId,
        transactionId: id,
        metadata: { fromStatus: currentStatus, toStatus: newStatus } as never,
      },
    });

    return updated;
  },
};
