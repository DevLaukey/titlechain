import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { AppError } from "./errorHandler";
import { UserRole, KycStatus } from "@title-chain/shared";

export interface JwtPayload {
  sub: string;      // user id
  email: string;
  role: UserRole;
  kycStatus: KycStatus;
  walletAddress?: string | null;
  iat?: number;
  exp?: number;
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("No authentication token provided", 401));
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      kycStatus: decoded.kycStatus,
      walletAddress: decoded.walletAddress,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError("Authentication token has expired", 401));
    }
    return next(new AppError("Invalid authentication token", 401));
  }
}

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}
