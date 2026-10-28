import { db } from "../db/index.js";
import { appointments } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export const getAppointments = async (req, res, next) => {
  try {
    const allAppointments = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.createdAt));
    res.json({ success: true, count: allAppointments.length, data: allAppointments });
  } catch (error) {
    next(error);
  }
};

export const getAppointmentById = async (req, res, next) => {
  try {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, req.params.id));

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }
    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const { patientName, doctorName, patientId, doctorId, date, time, type } = req.body;

    if (!patientName || !doctorName || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Patient name, doctor name, date, and time are required.",
      });
    }

    const newAppointment = {
      id: `apt-${Date.now()}`,
      patientId: patientId || null,
      patientName,
      doctorId: doctorId || null,
      doctorName,
      date,
      time,
      status: "Confirmed",
      type: type || "Consultation",
    };

    await db.insert(appointments).values(newAppointment);
    res.status(201).json({ success: true, data: newAppointment });
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required." });
    }

    const [updated] = await db
      .update(appointments)
      .set({ status })
      .where(eq(appointments.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
