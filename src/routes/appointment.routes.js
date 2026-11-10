import express from "express";
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointmentStatus,
  deleteAppointment,
} from "../controllers/appointment.controller.js";
import { verifyToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from "../validators/appointment.validator.js";

const router = express.Router();

router.get("/", verifyToken, getAppointments);
router.get("/:id", verifyToken, getAppointmentById);
router.post("/", verifyToken, validate({ body: createAppointmentSchema }), createAppointment);
router.patch("/:id/status", verifyToken, validate({ body: updateAppointmentStatusSchema }), updateAppointmentStatus);
router.delete("/:id", verifyToken, deleteAppointment);

export default router;

