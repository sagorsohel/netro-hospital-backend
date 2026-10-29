import { z } from "zod";
import { requiredString, optionalString, optionalEmail, optionalNonNegativeNumber, nonEmptyUpdate } from "./common.js";

const departmentFields = {
  name: requiredString("Department name"),
  description: optionalString(1000),
  icon: optionalString(500),
  image: optionalString(500),
  headOfDepartment: optionalString(),
  floor: optionalString(100),
  roomNumber: optionalString(100),
  contactEmail: optionalEmail(),
  contactPhone: optionalString(50),
  status: optionalString(50),
};

export const createDepartmentSchema = z.object(departmentFields);

export const updateDepartmentSchema = nonEmptyUpdate(
  z.object({
    ...departmentFields,
    name: departmentFields.name.optional(),
    doctorsCount: optionalNonNegativeNumber("Doctors count"),
  })
);
