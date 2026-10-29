import { ApiError } from "../utils/ApiError.js";

/**
 * Validate and sanitize request data against Zod schemas.
 * Parsed values replace the originals, so unknown keys are stripped
 * and transforms (trim, number coercion, ...) are applied.
 *
 * @param {{ body?: import("zod").ZodType, query?: import("zod").ZodType, params?: import("zod").ZodType }} schemas
 */
export const validate = (schemas) => (req, res, next) => {
  for (const key of ["params", "query", "body"]) {
    if (!schemas[key]) continue;

    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return next(ApiError.badRequest(errors[0].message, errors));
    }

    req[key] = result.data;
  }

  next();
};
