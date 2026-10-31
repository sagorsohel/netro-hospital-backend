import express from "express";
import {
  getAdmissions,
  getAdmissionById,
  createAdmission,
  dischargeAdmission,
  updateAdmission,
} from "../controllers/admission.controller.js";
import { verifyToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createAdmissionSchema,
  updateAdmissionSchema,
  dischargePatientSchema,
  admissionListQuerySchema,
} from "../validators/admission.validator.js";

const router = express.Router();

// List admissions
router.get("/", verifyToken, validate({ query: admissionListQuerySchema }), getAdmissions);

// Single admission detail
router.get("/:id", verifyToken, getAdmissionById);

// Create admission (auto-profile, bed assignment, POS bill)
router.post("/", verifyToken, validate({ body: createAdmissionSchema }), createAdmission);

// Update admission details
router.put("/:id", verifyToken, validate({ body: updateAdmissionSchema }), updateAdmission);

// Discharge patient (releases bed, settles bill)
router.post("/:id/discharge", verifyToken, validate({ body: dischargePatientSchema }), dischargeAdmission);

export default router;
