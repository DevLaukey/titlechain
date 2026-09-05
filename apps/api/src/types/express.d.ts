import { UserRole, KycStatus } from "@title-chain/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        kycStatus: KycStatus;
        walletAddress?: string | null;
      };
    }
  }
}

export {};
