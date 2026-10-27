import { Router } from "express";
import {
  getAppointments,
  createAppointment,
  updateAppointmentStatus
} from "../controllers/appointment.controller.js";

const router = Router();

router.get("/", getAppointments);
router.post("/", createAppointment);
router.patch("/:id/status", updateAppointmentStatus);

export default router;
