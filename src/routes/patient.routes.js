import express from "express";
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} from "../controllers/patient.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createPatientSchema,
  updatePatientSchema,
  patientListQuerySchema,
} from "../validators/patient.validator.js";

const router = express.Router();

// List patients with search/filter/pagination
router.get("/", verifyToken, validate({ query: patientListQuerySchema }), getPatients);

// Single patient permanent profile with full visit history
router.get("/:id", verifyToken, getPatientById);

// Create patient profile
router.post("/", verifyToken, validate({ body: createPatientSchema }), createPatient);

// Update patient profile
router.put("/:id", verifyToken, validate({ body: updatePatientSchema }), updatePatient);

// Delete patient (Admin only)
router.delete("/:id", verifyToken, requireRoles("admin"), deletePatient);

export default router;
