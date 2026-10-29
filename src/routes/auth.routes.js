import { Router } from "express";
import {
  login,
  register,
  getMe,
  changePassword,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.js";
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

export default router;
