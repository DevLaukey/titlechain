import { Router } from "express";
import { identityController } from "../controllers/identity.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// All identity routes require authentication
router.use(authenticate);

router.post("/kyc", identityController.submitKyc);
router.get("/kyc/status", identityController.getKycStatus);

export default router;
