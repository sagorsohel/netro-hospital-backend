import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { pharmacies, pharmacyUsers } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { ApiError } from "../utils/ApiError.js";
import { JWT_SECRET, JWT_EXPIRES_IN, PHARMACY_TOKEN_SCOPE } from "../middleware/pharmacyAuth.js";

const INVALID_CREDENTIALS = "Invalid pharmacy ID, phone number or password.";

/**
 * @desc Pharmacy user login
 * @route POST /api/v1/pharmacy-auth/login
 * @access Public
 */
export const pharmacyLogin = async (req, res, next) => {
  try {
    const { pharmacyId, phone, password } = req.body;

    const [row] = await db
      .select({ user: pharmacyUsers, pharmacy: pharmacies })
      .from(pharmacyUsers)
      .innerJoin(pharmacies, eq(pharmacyUsers.pharmacyId, pharmacies.id))
      .where(and(eq(pharmacyUsers.pharmacyId, pharmacyId), eq(pharmacyUsers.phone, phone)));

    // Compare the password before revealing account/pharmacy status
    if (!row || !(await bcrypt.compare(password, row.user.password))) {
      throw ApiError.unauthorized(INVALID_CREDENTIALS);
    }

    const { user, pharmacy } = row;
    if (!pharmacy.isActive) {
      throw ApiError.forbidden("This pharmacy has been deactivated. Please contact hospital administration.");
    }
    if (!user.isActive) {
      throw ApiError.forbidden("Your account has been deactivated. Please contact your pharmacy owner.");
    }

    await db.update(pharmacyUsers).set({ lastLoginAt: new Date() }).where(eq(pharmacyUsers.id, user.id));

    const token = jwt.sign(
      { id: user.id, pharmacyId: pharmacy.id, role: user.role, name: user.name, scope: PHARMACY_TOKEN_SCOPE },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
      pharmacy: {
        id: pharmacy.id,
        name: pharmacy.name,
        address: pharmacy.address,
        phone: pharmacy.phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Current pharmacy user + their pharmacy
 * @route GET /api/v1/pharmacy-auth/me
 * @access Pharmacy user
 */
export const getPharmacyMe = async (req, res, next) => {
  try {
    const [pharmacy] = await db
      .select({
        id: pharmacies.id,
        name: pharmacies.name,
        address: pharmacies.address,
        phone: pharmacies.phone,
        email: pharmacies.email,
        licenseNo: pharmacies.licenseNo,
      })
      .from(pharmacies)
      .where(eq(pharmacies.id, req.actor.pharmacyId));

    const { type, pharmacyName, ...user } = req.actor;
    res.json({ success: true, data: { user, pharmacy } });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Change own password
 * @route POST /api/v1/pharmacy-auth/change-password
 * @access Pharmacy user
 */
export const pharmacyChangePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [user] = await db
      .select({ password: pharmacyUsers.password })
      .from(pharmacyUsers)
      .where(eq(pharmacyUsers.id, req.actor.id));

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw ApiError.unauthorized("Current password does not match.");
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await db
      .update(pharmacyUsers)
      .set({ password: hashedNew, updatedAt: new Date() })
      .where(eq(pharmacyUsers.id, req.actor.id));

    res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
};
