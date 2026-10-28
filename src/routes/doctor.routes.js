import express from "express";
import {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctor.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();

// Read operations: Available to authenticated users
router.get("/", verifyToken, getDoctors);
router.get("/:id", verifyToken, getDoctorById);

// Write/Mutate operations: Admin only
router.post("/", verifyToken, requireRoles("admin"), createDoctor);
router.put("/:id", verifyToken, requireRoles("admin"), updateDoctor);
router.delete("/:id", verifyToken, requireRoles("admin"), deleteDoctor);

export default router;
