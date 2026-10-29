import { z } from "zod";

// Clients often send "" or null for empty form inputs; treat those as "not provided"
const blankToUndefined = (value) => (value === "" || value === null ? undefined : value);
const nullToUndefined = (value) => (value === null ? undefined : value);

export const requiredString = (label, max = 255) =>
  z
    .string({
      error: (issue) =>
        issue.input === undefined || issue.input === null
          ? `${label} is required.`
          : `${label} must be a string.`,
    })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`);

export const optionalString = (max = 255) =>
  z.preprocess(
    nullToUndefined,
    z.string().trim().max(max, `Must be at most ${max} characters.`).optional()
  );

// "" is allowed so an existing email can be cleared on update
export const optionalEmail = () =>
  z.preprocess(
    nullToUndefined,
    z
      .union([
        z.literal(""),
        z.string().trim().toLowerCase().email("Please provide a valid email address."),
      ])
      .optional()
  );

// Accepts numbers or numeric strings ("1500.50")
const numeric = (label) =>
  z.coerce.number({ error: `${label} must be a valid number.` }).refine(Number.isFinite, {
    message: `${label} must be a valid number.`,
  });

export const requiredPositiveNumber = (label) =>
  z.preprocess(
    blankToUndefined,
    z
      .any()
      .refine((value) => value !== undefined, `${label} is required.`)
      .pipe(numeric(label).positive(`${label} must be greater than 0.`))
  );

export const optionalNonNegativeNumber = (label) =>
  z.preprocess(blankToUndefined, numeric(label).nonnegative(`${label} cannot be negative.`).optional());

export const optionalPositiveInt = (label) =>
  z.preprocess(
    blankToUndefined,
    numeric(label).int(`${label} must be a whole number.`).positive(`${label} must be greater than 0.`).optional()
  );

// Accepts true/false or "true"/"false" (form submissions)
export const optionalBoolean = () =>
  z.preprocess(
    (value) => (value === "true" ? true : value === "false" ? false : blankToUndefined(value)),
    z.boolean().optional()
  );

// Accepts an array or a JSON-encoded array string
export const jsonArray = (label, itemSchema = z.any()) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return nullToUndefined(value);
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, z.array(itemSchema, { error: `${label} must be an array.` }).optional());

// YYYY-MM-DD
export const optionalDate = (label) =>
  z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be in YYYY-MM-DD format.`)
      .optional()
  );

export const requiredDate = (label) =>
  requiredString(label, 50).regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be in YYYY-MM-DD format.`);

// Reject update payloads that contain no recognised fields
export const nonEmptyUpdate = (schema) =>
  schema.refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Provide at least one valid field to update.",
  });
