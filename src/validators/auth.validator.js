import { z } from "zod";
import { requiredString, optionalString } from "./common.js";

export const USER_ROLES = ["admin", "pharmacist", "doctor", "staff", "manager"];

const email = requiredString("Email").toLowerCase().email("Please provide a valid email address.");

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Password is required." }).min(1, "Password is required."),
});

export const registerSchema = z.object({
  name: requiredString("Name"),
  email,
  password: z
    .string({ error: "Password is required." })
    .min(6, "Password must be at least 6 characters long."),
  role: z.enum(USER_ROLES, { error: `Role must be one of: ${USER_ROLES.join(", ")}.` }).default("staff"),
  branchName: optionalString(),
  phone: optionalString(50),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ error: "Current password is required." })
    .min(1, "Current password is required."),
  newPassword: z
    .string({ error: "New password is required." })
    .min(6, "New password must be at least 6 characters long."),
});
