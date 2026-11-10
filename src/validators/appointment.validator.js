import { z } from "zod";
import {
  requiredString,
  optionalString,
  optionalNonNegativeNumber,
  optionalPositiveInt,
  nonEmptyUpdate,
} from "./common.js";

const appointmentFields = {
  patientId: optionalString(64),
  patientName: requiredString("Patient name"),
  patientPhone: optionalString(50),
  patientAge: optionalPositiveInt("Patient age"),
  patientGender: optionalString(20),
  doctorId: requiredString("Doctor ID"),
  doctorName: requiredString("Doctor name"),
  department: optionalString(255),
  roomNumber: optionalString(100),
  date: requiredString("Appointment date"),
  time: optionalString(50),
  serialNumber: optionalPositiveInt("Serial number"),
  status: optionalString(50),
  type: optionalString(100),
  fee: optionalNonNegativeNumber("Fee"),
  discount: optionalNonNegativeNumber("Discount"),
  paidAmount: optionalNonNegativeNumber("Paid amount"),
  dueAmount: optionalNonNegativeNumber("Due amount"),
  paymentStatus: optionalString(50),
  paymentMethod: optionalString(50),
  symptoms: optionalString(2000),
};

export const createAppointmentSchema = z.object(appointmentFields);

export const updateAppointmentSchema = nonEmptyUpdate(
  z.object({
    ...appointmentFields,
    patientName: appointmentFields.patientName.optional(),
    doctorId: appointmentFields.doctorId.optional(),
    doctorName: appointmentFields.doctorName.optional(),
    date: appointmentFields.date.optional(),
  })
);

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["Waiting", "In Consultation", "Completed", "Cancelled", "Confirmed", "Pending"]),
});

