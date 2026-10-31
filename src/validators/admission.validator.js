import { z } from "zod";
import {
  requiredString,
  optionalString,
  optionalPositiveInt,
  optionalNonNegativeNumber,
  jsonArray,
  nonEmptyUpdate,
} from "./common.js";

export const ADMISSION_STATUSES = ["Admitted", "Discharged", "Under Observation", "Transferred"];

const admissionFields = {
  isNewPatient: z.boolean().optional(),
  patientId: optionalString(64),
  patientUniqueId: optionalString(64),
  patientName: requiredString("Patient Name", 255),
  patientPhone: optionalString(50),
  patientAge: optionalPositiveInt("Patient Age"),
  patientGender: optionalString(20),
  dob: optionalString(50),
  patientEmail: optionalString(255),
  patientAddress: optionalString(500),
  patientBloodGroup: optionalString(10),
  guardianName: optionalString(255),
  guardianPhone: optionalString(50),
  guardianRelation: optionalString(50),
  emergencyContact: optionalString(50),
  allergies: optionalString(500),
  maritalStatus: optionalString(50),
  occupation: optionalString(100),

  // Room & Bed
  roomId: optionalString(64),
  roomNumber: optionalString(100),
  roomName: optionalString(255),
  bedNumber: optionalString(50),
  perDayCharge: optionalNonNegativeNumber("Per Day Charge"),

  // Doctor & Department
  doctorId: optionalString(64),
  doctorName: optionalString(255),
  department: optionalString(255),

  // Surgical Operation
  operationId: optionalString(64),
  operationName: optionalString(255),
  operationPrice: optionalNonNegativeNumber("Operation Price"),

  // Financial Charges & POS
  extraCharges: jsonArray("Extra Charges"),
  admissionFee: optionalNonNegativeNumber("Admission Fee"),
  roomCharge: optionalNonNegativeNumber("Room Charge"),
  operationCharge: optionalNonNegativeNumber("Operation Charge"),
  extraChargesTotal: optionalNonNegativeNumber("Extra Charges Total"),
  subtotal: optionalNonNegativeNumber("Subtotal"),
  discountAmount: optionalNonNegativeNumber("Discount Amount"),
  grandTotal: optionalNonNegativeNumber("Grand Total"),
  advancePayment: optionalNonNegativeNumber("Advance Payment"),
  dueAmount: optionalNonNegativeNumber("Due Amount"),
  paymentMethod: optionalString(50),
  paymentStatus: optionalString(50),

  // Clinical
  diagnosis: optionalString(1000),
  notes: optionalString(1000),
  status: optionalString(50),
};

export const createAdmissionSchema = z.object(admissionFields);

export const updateAdmissionSchema = nonEmptyUpdate(
  z.object({
    ...admissionFields,
    patientName: admissionFields.patientName.optional(),
  })
);

export const dischargePatientSchema = z.object({
  dischargeNotes: optionalString(1000),
  finalPaymentMethod: optionalString(50),
  settleDue: z.boolean().optional(),
});

export const admissionListQuerySchema = z.object({
  search: optionalString(),
  status: optionalString(),
  roomId: optionalString(),
  doctorId: optionalString(),
  page: optionalPositiveInt("Page"),
  limit: optionalPositiveInt("Limit"),
});
