import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, pharmacies, pharmacyUsers } from "../db/schema.js";
import { ApiError } from "../utils/ApiError.js";

export const JWT_SECRET = process.env.JWT_SECRET || "netro_hospital_jwt_super_secret_key_2026_secure";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Marks a JWT as belonging to the pharmacy auth system (hospital tokens have no scope)
export const PHARMACY_TOKEN_SCOPE = "pharmacy";

const readBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1] || null;
};

const decodeToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw ApiError.unauthorized(
      error.name === "TokenExpiredError"
        ? "Token has expired. Please login again."
        : "Invalid token or signature verification failed."
    );
  }
};

// Load a pharmacy user + their pharmacy and make sure both are active
const loadPharmacyActor = async (decoded) => {
  const [row] = await db
    .select({
      id: pharmacyUsers.id,
      pharmacyId: pharmacyUsers.pharmacyId,
      name: pharmacyUsers.name,
      phone: pharmacyUsers.phone,
      email: pharmacyUsers.email,
      role: pharmacyUsers.role,
      isActive: pharmacyUsers.isActive,
      pharmacyName: pharmacies.name,
      pharmacyActive: pharmacies.isActive,
    })
    .from(pharmacyUsers)
    .innerJoin(pharmacies, eq(pharmacyUsers.pharmacyId, pharmacies.id))
    .where(eq(pharmacyUsers.id, decoded.id));

  if (!row) throw ApiError.unauthorized("User associated with this token no longer exists.");
  if (!row.isActive) throw ApiError.forbidden("Your account has been deactivated. Please contact your pharmacy owner.");
  if (!row.pharmacyActive) throw ApiError.forbidden("This pharmacy has been deactivated. Please contact hospital administration.");

  const { pharmacyActive, ...user } = row;
  return { type: "pharmacy", ...user };
};

// Hospital admins get full access to every pharmacy
const loadAdminActor = async (decoded) => {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, decoded.id));

  if (!user) throw ApiError.unauthorized("User associated with this token no longer exists.");
  if (!user.isActive) throw ApiError.forbidden("Account has been deactivated. Please contact administrator.");
  if (user.role !== "admin") throw ApiError.forbidden("Only hospital admins or pharmacy users can access pharmacy resources.");

  return { type: "admin", ...user };
};

/**
 * Authenticate a request to pharmacy resources.
 * Accepts a pharmacy token, or a hospital token belonging to an admin.
 * Sets req.actor = { type: "pharmacy" | "admin", id, role, pharmacyId?, ... }
 */
export const verifyPharmacyAccess = async (req, res, next) => {
  try {
    const token = readBearerToken(req);
    if (!token) throw ApiError.unauthorized("Access denied. No authentication token provided in Authorization header.");

    const decoded = decodeToken(token);
    req.actor = decoded.scope === PHARMACY_TOKEN_SCOPE ? await loadPharmacyActor(decoded) : await loadAdminActor(decoded);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate a pharmacy user only (hospital tokens rejected).
 * Used for self-service endpoints like /pharmacy-auth/me.
 */
export const verifyPharmacyToken = async (req, res, next) => {
  try {
    const token = readBearerToken(req);
    if (!token) throw ApiError.unauthorized("Access denied. No authentication token provided in Authorization header.");

    const decoded = decodeToken(token);
    if (decoded.scope !== PHARMACY_TOKEN_SCOPE) throw ApiError.unauthorized("A pharmacy login token is required.");

    req.actor = await loadPharmacyActor(decoded);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Pharmacy users may only touch their own pharmacy (req.params.pharmacyId).
 * Admins pass through. Run after validate({ params }) so pharmacyId is a number.
 */
export const requireSamePharmacy = (req, res, next) => {
  if (req.actor?.type === "admin") return next();
  if (req.actor?.pharmacyId !== Number(req.params.pharmacyId)) {
    return next(ApiError.forbidden("You can only access your own pharmacy."));
  }
  next();
};

/**
 * Restrict to the given pharmacy roles. Hospital admins always pass.
 */
export const requirePharmacyRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.actor) return next(ApiError.unauthorized());
    if (req.actor.type === "admin") return next();
    if (!allowedRoles.includes(req.actor.role)) {
      return next(
        ApiError.forbidden(
          `Forbidden. Required pharmacy role: ${allowedRoles.join(", ")}. Your role: ${req.actor.role}`
        )
      );
    }
    next();
  };
