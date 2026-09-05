import { Request, Response, NextFunction } from "express";
import { UserRole } from "@title-chain/shared";
import { AppError } from "./errorHandler";

/**
 * Role-based access control middleware.
 * Usage: router.get("/protected", authenticate, rbac([UserRole.ADMIN, UserRole.REGISTRAR]), handler)
 */
export function rbac(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required roles: ${allowedRoles.join(", ")}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * Convenience alias that accepts plain string arrays.
 * Usage: requireRole(["ADMIN", "REGISTRAR"])
 */
export function requireRole(roles: string[]) {
  return rbac(roles as UserRole[]);
}
