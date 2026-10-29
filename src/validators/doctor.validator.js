import { z } from "zod";
import {
  requiredString,
  optionalString,
  optionalEmail,
  optionalNonNegativeNumber,
  optionalPositiveInt,
  optionalBoolean,
  nonEmptyUpdate,
} from "./common.js";

// Accepts ["Sat", "Sun"], '["Sat","Sun"]' or "Sat, Sun"
const availableDays = z.preprocess((value) => {
  if (typeof value !== "string") return value === null ? undefined : value;
  try {
    return JSON.parse(value);
  } catch {
    return value.split(",").map((day) => day.trim()).filter(Boolean);
  }
}, z.array(z.string().trim(), { error: "Available days must be a list of days." }).optional());

const doctorFields = {
  name: requiredString("Doctor's name"),
  departmentId: optionalString(64),
  department: requiredString("Department"),
  specialty: optionalString(),
  experience: optionalString(100),
  isHead: optionalBoolean(),
  contactNumber: optionalString(50),
  roomNumber: optionalString(100),
  serialContactNumber: optionalString(50),
  firstVisitFee: optionalNonNegativeNumber("First visit fee"),
  secondVisitFee: optionalNonNegativeNumber("Second visit fee"),
  dailyPatientLimit: optionalPositiveInt("Daily patient limit"),
  consultationStartTime: optionalString(50),
  consultationEndTime: optionalString(50),
  reportConsultationTime: optionalString(100),
  availableDays,
  offDays: optionalString(100),
  image: optionalString(500),
  email: optionalEmail(),
  status: optionalString(50),
};

export const createDoctorSchema = z.object(doctorFields);

export const updateDoctorSchema = nonEmptyUpdate(
  z.object({
    ...doctorFields,
    name: doctorFields.name.optional(),
    department: doctorFields.department.optional(),
  })
);
