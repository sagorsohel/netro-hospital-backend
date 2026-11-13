import { z } from "zod";
import { requiredString, optionalString, optionalEmail, optionalBoolean, nonEmptyUpdate } from "./common.js";

// Ordered from most to least privileged
export const PHARMACY_ROLES = ["owner", "manager", "pharmacist", "cashier", "staff"];

const roleEnum = z.enum(PHARMACY_ROLES, {
  error: `Role must be one of: ${PHARMACY_ROLES.join(", ")}.`,
});

const password = (label = "Password") =>
  z
    .string({ error: `${label} is required.` })
    .min(6, `${label} must be at least 6 characters long.`)
    .max(128, `${label} must be at most 128 characters.`);

const pharmacyIdField = z.coerce
  .number({ error: "Pharmacy ID must be a number." })
  .int("Pharmacy ID must be a whole number.")
  .positive("Pharmacy ID must be a positive number.");

// ---------- Params ----------

export const pharmacyIdParamSchema = z.object({
  pharmacyId: pharmacyIdField,
});

export const pharmacyUserParamSchema = z.object({
  pharmacyId: pharmacyIdField,
  userId: requiredString("User ID", 64),
});

// ---------- Pharmacies (hospital admin) ----------

const pharmacyFields = {
  name: requiredString("Pharmacy name"),
  address: requiredString("Address", 500),
  phone: requiredString("Phone number", 50),
  email: optionalEmail(),
  licenseNo: requiredString("License number", 100),
};

export const createPharmacySchema = z.object({
  ...pharmacyFields,
  owner: z.object(
    {
      name: requiredString("Owner name"),
      phone: requiredString("Owner phone", 50),
      email: optionalEmail(),
      password: password("Owner password"),
    },
    { error: "Owner details are required." }
  ),
});

export const updatePharmacySchema = nonEmptyUpdate(
  z.object({
    name: pharmacyFields.name.optional(),
    address: pharmacyFields.address.optional(),
    phone: pharmacyFields.phone.optional(),
    email: pharmacyFields.email,
    licenseNo: pharmacyFields.licenseNo.optional(),
  })
);

export const pharmacyStatusSchema = z.object({
  isActive: z.boolean({ error: "isActive must be true or false." }),
});

export const listPharmaciesQuerySchema = z.object({
  search: optionalString(100),
  isActive: optionalBoolean(),
  page: optionalString(10),
  limit: optionalString(10),
});

// ---------- Pharmacy auth ----------

export const pharmacyLoginSchema = z.object({
  pharmacyId: pharmacyIdField,
  phone: requiredString("Phone number", 50),
  password: z.string({ error: "Password is required." }).min(1, "Password is required."),
});

export const pharmacyChangePasswordSchema = z.object({
  currentPassword: z
    .string({ error: "Current password is required." })
    .min(1, "Current password is required."),
  newPassword: password("New password"),
});

export const resetPasswordSchema = z.object({
  newPassword: password("New password"),
});

// ---------- Pharmacy users (staff management) ----------

export const createPharmacyUserSchema = z.object({
  name: requiredString("Name"),
  phone: requiredString("Phone number", 50),
  email: optionalEmail(),
  password: password(),
  role: roleEnum.default("staff"),
});

export const updatePharmacyUserSchema = nonEmptyUpdate(
  z.object({
    name: requiredString("Name").optional(),
    phone: requiredString("Phone number", 50).optional(),
    email: optionalEmail(),
    role: roleEnum.optional(),
    isActive: optionalBoolean(),
  })
);

export const listPharmacyUsersQuerySchema = z.object({
  search: optionalString(100),
  role: roleEnum.optional(),
  isActive: optionalBoolean(),
  page: optionalString(10),
  limit: optionalString(10),
});
