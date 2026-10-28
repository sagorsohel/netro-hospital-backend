import { Router } from "express";
import {
  login,
  register,
  getMe,
  changePassword,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

// Public routes
router.post("/login", login);
router.post("/register", register);

// Protected routes
router.get("/me", verifyToken, getMe);
router.post("/change-password", verifyToken, changePassword);

export default router;
