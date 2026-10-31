import { z } from "zod";
import {
  requiredString,
  optionalString,
  optionalPositiveInt,
  nonEmptyUpdate,
} from "./common.js";

const patientFields = {
  name: requiredString("Patient Name", 255),
  age: optionalPositiveInt("Age"),
  dob: optionalString(50),
  gender: optionalString(20),
  phone: requiredString("Phone Number", 50),
  email: optionalString(255),
  bloodGroup: optionalString(10),
  address: optionalString(500),
  guardianName: optionalString(255),
  guardianPhone: optionalString(50),
  guardianRelation: optionalString(50),
  emergencyContact: optionalString(50),
  maritalStatus: optionalString(50),
  occupation: optionalString(100),
  allergies: optionalString(500),
  status: optionalString(50),
};

export const createPatientSchema = z.object(patientFields);

export const updatePatientSchema = nonEmptyUpdate(
  z.object({
    ...patientFields,
    name: patientFields.name.optional(),
    phone: patientFields.phone.optional(),
  })
);

export const patientListQuerySchema = z.object({
  search: optionalString(),
  gender: optionalString(),
  bloodGroup: optionalString(),
  status: optionalString(),
  page: optionalPositiveInt("Page"),
  limit: optionalPositiveInt("Limit"),
});
