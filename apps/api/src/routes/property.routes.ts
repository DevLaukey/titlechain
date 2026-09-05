import { Router } from "express";
import { propertyController } from "../controllers/property.controller";
import { authenticate } from "../middleware/auth";
import { rbac } from "../middleware/rbac";
import { UserRole } from "@title-chain/shared";

const router = Router();

// Public routes
router.get("/", propertyController.listProperties);
router.get("/:id", propertyController.getProperty);

// Protected routes
router.post(
  "/",
  authenticate,
  rbac([UserRole.SELLER, UserRole.ADMIN]),
  propertyController.createProperty
);

router.patch("/:id", authenticate, propertyController.updateProperty);

export default router;
