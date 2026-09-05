import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authService } from "../services/auth.service";
import { ApiResponse } from "@title-chain/shared";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  role: z.enum(["BUYER", "SELLER"] as const).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const walletLoginSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/, "Invalid Ethereum wallet address"),
  message: z.string().min(1, "Message is required"),
  signature: z.string().min(1, "Signature is required"),
});

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = registerSchema.parse(req.body);
      const result = await authService.register({
        email: body.email,
        password: body.password,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        role: body.role,
      });

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: "Registration successful",
      };
      res.status(201).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const response: ApiResponse = {
          success: false,
          error: err.errors.map((e) => e.message).join(", "),
        };
        return res.status(400).json(response);
      }
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = loginSchema.parse(req.body);
      const result = await authService.login(body);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: "Login successful",
      };
      res.status(200).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const response: ApiResponse = {
          success: false,
          error: err.errors.map((e) => e.message).join(", "),
        };
        return res.status(400).json(response);
      }
      next(err);
    }
  },

  async walletLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const body = walletLoginSchema.parse(req.body);
      const result = await authService.walletLogin(body);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: "Wallet authentication successful",
      };
      res.status(200).json(response);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const response: ApiResponse = {
          success: false,
          error: err.errors.map((e) => e.message).join(", "),
        };
        return res.status(400).json(response);
      }
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await authService.getMe(userId);

      const response: ApiResponse<typeof user> = {
        success: true,
        data: user,
      };
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  },
};
