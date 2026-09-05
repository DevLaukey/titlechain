import bcrypt from "bcryptjs";
import { ethers } from "ethers";
import { PrismaClient } from "@prisma/client";
import { signToken } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { UserRole, KycStatus } from "@title-chain/shared";

const prisma = new PrismaClient();

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: "BUYER" | "SELLER";
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface WalletLoginInput {
  walletAddress: string;
  message: string;
  signature: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    kycStatus: KycStatus;
    walletAddress?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
}

function mapRole(role: string): UserRole {
  return role as UserRole;
}

function mapKycStatus(status: string): KycStatus {
  return status as KycStatus;
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new AppError("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        // Prisma accepts the enum string value directly
        role: (input.role ?? "BUYER") as never,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "User",
        entityId: user.id,
        action: "USER_REGISTERED",
        actorId: user.id,
        metadata: { email: user.email },
      },
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: mapRole(user.role as string),
      kycStatus: mapKycStatus(user.kycStatus as string),
      walletAddress: user.walletAddress,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: mapRole(user.role as string),
        kycStatus: mapKycStatus(user.kycStatus as string),
        walletAddress: user.walletAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (!user || !user.passwordHash) {
      throw new AppError("Invalid email or password", 401);
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError("Invalid email or password", 401);
    }

    await prisma.auditLog.create({
      data: {
        entityType: "User",
        entityId: user.id,
        action: "USER_LOGIN",
        actorId: user.id,
        metadata: { method: "email" },
      },
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: mapRole(user.role as string),
      kycStatus: mapKycStatus(user.kycStatus as string),
      walletAddress: user.walletAddress,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: mapRole(user.role as string),
        kycStatus: mapKycStatus(user.kycStatus as string),
        walletAddress: user.walletAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  },

  async walletLogin(input: WalletLoginInput): Promise<AuthResult> {
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(input.message, input.signature);
    } catch {
      throw new AppError("Invalid wallet signature", 401);
    }

    if (recoveredAddress.toLowerCase() !== input.walletAddress.toLowerCase()) {
      throw new AppError(
        "Signature does not match the provided wallet address",
        401
      );
    }

    let user = await prisma.user.findUnique({
      where: { walletAddress: input.walletAddress.toLowerCase() },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `${input.walletAddress.toLowerCase()}@wallet.titlechain`,
          walletAddress: input.walletAddress.toLowerCase(),
          role: "BUYER" as never,
        },
      });

      await prisma.auditLog.create({
        data: {
          entityType: "User",
          entityId: user.id,
          action: "USER_REGISTERED",
          actorId: user.id,
          metadata: { method: "wallet", walletAddress: input.walletAddress },
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: "User",
        entityId: user.id,
        action: "WALLET_CONNECTED",
        actorId: user.id,
        metadata: { walletAddress: input.walletAddress },
      },
    });

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: mapRole(user.role as string),
      kycStatus: mapKycStatus(user.kycStatus as string),
      walletAddress: user.walletAddress,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: mapRole(user.role as string),
        kycStatus: mapKycStatus(user.kycStatus as string),
        walletAddress: user.walletAddress,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        kycStatus: true,
        walletAddress: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  },
};
