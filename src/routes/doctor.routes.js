import express from "express";
import {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctor.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createDoctorSchema,
  updateDoctorSchema,
} from "../validators/doctor.validator.js";

const router = express.Router();

// Read operations: Available to authenticated users
router.get("/", verifyToken, getDoctors);
router.get("/:id", verifyToken, getDoctorById);

// Write/Mutate operations: Admin only
router.post("/", verifyToken, requireRoles("admin"), validate({ body: createDoctorSchema }), createDoctor);
router.put("/:id", verifyToken, requireRoles("admin"), validate({ body: updateDoctorSchema }), updateDoctor);
router.delete("/:id", verifyToken, requireRoles("admin"), deleteDoctor);

export default router;
