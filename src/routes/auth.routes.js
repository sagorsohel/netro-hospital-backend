import { Router } from "express";
import {
  login,
  register,
  getMe,
  changePassword,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/auth.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";

const router = Router();

// Public routes
router.post("/login", validate({ body: loginSchema }), login);
router.post("/register", validate({ body: registerSchema }), register);

// Protected routes
router.get("/me", verifyToken, getMe);
router.post("/change-password", verifyToken, validate({ body: changePasswordSchema }), changePassword);

// User & Role Management (Super Admin & Admin only)
router.get("/users", verifyToken, requireRoles("admin"), getUsers);
router.post("/users", verifyToken, requireRoles("admin"), createUser);
router.put("/users/:id", verifyToken, requireRoles("admin"), updateUser);
router.delete("/users/:id", verifyToken, requireRoles("admin"), deleteUser);

export default router;
