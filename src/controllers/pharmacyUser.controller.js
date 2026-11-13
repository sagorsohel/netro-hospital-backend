import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { pharmacies, pharmacyUsers } from "../db/schema.js";
import { and, eq, ilike, or, desc, count, ne } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions } from "../utils/query.js";

// Never select the password hash into API responses
export const publicPharmacyUserColumns = {
  id: pharmacyUsers.id,
  pharmacyId: pharmacyUsers.pharmacyId,
  name: pharmacyUsers.name,
  phone: pharmacyUsers.phone,
  email: pharmacyUsers.email,
  role: pharmacyUsers.role,
  isActive: pharmacyUsers.isActive,
  lastLoginAt: pharmacyUsers.lastLoginAt,
  createdAt: pharmacyUsers.createdAt,
  updatedAt: pharmacyUsers.updatedAt,
};

// Which roles each pharmacy role may create / edit / delete.
// Only hospital admins can create or manage owners.
const MANAGEABLE_ROLES = {
  owner: ["manager", "pharmacist", "cashier", "staff"],
  manager: ["pharmacist", "cashier", "staff"],
};

const canManageRole = (actor, role) =>
  actor.type === "admin" || (MANAGEABLE_ROLES[actor.role] || []).includes(role);

const assertCanManageRole = (actor, role, action) => {
  if (!canManageRole(actor, role)) {
    throw ApiError.forbidden(`Your role (${actor.role}) cannot ${action} a user with role "${role}".`);
  }
};

const isSelf = (actor, userId) => actor.type === "pharmacy" && actor.id === userId;

const ensurePharmacyExists = async (pharmacyId) => {
  const [pharmacy] = await db.select({ id: pharmacies.id }).from(pharmacies).where(eq(pharmacies.id, pharmacyId));
  if (!pharmacy) throw ApiError.notFound(`Pharmacy #${pharmacyId} not found.`);
};

const findPharmacyUser = async (pharmacyId, userId) => {
  const [user] = await db
    .select(publicPharmacyUserColumns)
    .from(pharmacyUsers)
    .where(and(eq(pharmacyUsers.pharmacyId, pharmacyId), eq(pharmacyUsers.id, userId)));
  if (!user) throw ApiError.notFound("Pharmacy user not found.");
  return user;
};

const ensurePhoneAvailable = async (pharmacyId, phone, excludeUserId) => {
  const conditions = [eq(pharmacyUsers.pharmacyId, pharmacyId), eq(pharmacyUsers.phone, phone)];
  if (excludeUserId) conditions.push(ne(pharmacyUsers.id, excludeUserId));
  const [existing] = await db.select({ id: pharmacyUsers.id }).from(pharmacyUsers).where(and(...conditions));
  if (existing) throw ApiError.conflict("A user with this phone number already exists in this pharmacy.");
};

// A pharmacy must always keep at least one active owner
const ensureAnotherActiveOwner = async (pharmacyId, ownerId) => {
  const [{ total }] = await db
    .select({ total: count() })
    .from(pharmacyUsers)
    .where(
      and(
        eq(pharmacyUsers.pharmacyId, pharmacyId),
        eq(pharmacyUsers.role, "owner"),
        eq(pharmacyUsers.isActive, true),
        ne(pharmacyUsers.id, ownerId)
      )
    );
  if (Number(total) === 0) {
    throw ApiError.badRequest("A pharmacy must keep at least one active owner.");
  }
};

/**
 * @desc List users of a pharmacy
 * @route GET /api/v1/pharmacies/:pharmacyId/users
 * @access Owner, Manager, Hospital Admin
 */
export const getPharmacyUsers = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    await ensurePharmacyExists(pharmacyId);

    const { page, limit, offset } = getPagination(req.query, 20);
    const { search, role, isActive } = req.query;

    const conditions = [eq(pharmacyUsers.pharmacyId, pharmacyId)];
    if (search) {
      const term = `%${search}%`;
      conditions.push(
        or(ilike(pharmacyUsers.name, term), ilike(pharmacyUsers.phone, term), ilike(pharmacyUsers.email, term))
      );
    }
    if (role) conditions.push(eq(pharmacyUsers.role, role));
    if (isActive !== undefined) conditions.push(eq(pharmacyUsers.isActive, isActive));
    const where = combineConditions(conditions);

    const [list, [{ total }]] = await Promise.all([
      db
        .select(publicPharmacyUserColumns)
        .from(pharmacyUsers)
        .where(where)
        .orderBy(desc(pharmacyUsers.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(pharmacyUsers).where(where),
    ]);

    res.json({
      success: true,
      data: list,
      pagination: buildPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get one pharmacy user
 * @route GET /api/v1/pharmacies/:pharmacyId/users/:userId
 * @access Owner, Manager, Hospital Admin
 */
export const getPharmacyUserById = async (req, res, next) => {
  try {
    const { pharmacyId, userId } = req.params;
    const user = await findPharmacyUser(pharmacyId, userId);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Add a user to a pharmacy
 * @route POST /api/v1/pharmacies/:pharmacyId/users
 * @access Owner, Manager (lower roles only), Hospital Admin
 */
export const createPharmacyUser = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const { name, phone, email, password, role } = req.body;

    await ensurePharmacyExists(pharmacyId);
    assertCanManageRole(req.actor, role, "create");
    await ensurePhoneAvailable(pharmacyId, phone);

    const hashedPassword = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(pharmacyUsers)
      .values({
        id: generateId("phu"),
        pharmacyId,
        name,
        phone,
        email: email || null,
        password: hashedPassword,
        role,
        isActive: true,
      })
      .returning(publicPharmacyUserColumns);

    res.status(201).json({
      success: true,
      message: `${created.name} added as ${created.role}.`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update a pharmacy user's profile, role or active status
 * @route PUT /api/v1/pharmacies/:pharmacyId/users/:userId
 * @access Owner, Manager (lower roles only), Hospital Admin
 */
export const updatePharmacyUser = async (req, res, next) => {
  try {
    const { pharmacyId, userId } = req.params;
    const target = await findPharmacyUser(pharmacyId, userId);
    const updates = Object.fromEntries(Object.entries(req.body).filter(([, value]) => value !== undefined));

    if (isSelf(req.actor, userId)) {
      // Users can edit their own profile fields here, but not their own role or status
      if (updates.role !== undefined || updates.isActive !== undefined) {
        throw ApiError.forbidden("You cannot change your own role or active status.");
      }
    } else {
      assertCanManageRole(req.actor, target.role, "update");
      if (updates.role !== undefined) assertCanManageRole(req.actor, updates.role, "assign the role of");
    }

    const losesOwnership =
      target.role === "owner" &&
      ((updates.role !== undefined && updates.role !== "owner") || updates.isActive === false);
    if (losesOwnership) await ensureAnotherActiveOwner(pharmacyId, userId);

    if (updates.phone && updates.phone !== target.phone) await ensurePhoneAvailable(pharmacyId, updates.phone, userId);
    if (updates.email === "") updates.email = null;

    const [updated] = await db
      .update(pharmacyUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pharmacyUsers.id, userId))
      .returning(publicPharmacyUserColumns);

    res.json({ success: true, message: "Pharmacy user updated successfully.", data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Reset another pharmacy user's password
 * @route POST /api/v1/pharmacies/:pharmacyId/users/:userId/reset-password
 * @access Owner, Manager (lower roles only), Hospital Admin
 */
export const resetPharmacyUserPassword = async (req, res, next) => {
  try {
    const { pharmacyId, userId } = req.params;
    const target = await findPharmacyUser(pharmacyId, userId);

    if (isSelf(req.actor, userId)) {
      throw ApiError.badRequest("Use /pharmacy-auth/change-password to change your own password.");
    }
    assertCanManageRole(req.actor, target.role, "reset the password of");

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
    await db
      .update(pharmacyUsers)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(pharmacyUsers.id, userId));

    res.json({ success: true, message: `Password reset for ${target.name}.` });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Remove a user from a pharmacy
 * @route DELETE /api/v1/pharmacies/:pharmacyId/users/:userId
 * @access Owner, Manager (lower roles only), Hospital Admin
 */
export const deletePharmacyUser = async (req, res, next) => {
  try {
    const { pharmacyId, userId } = req.params;
    const target = await findPharmacyUser(pharmacyId, userId);

    if (isSelf(req.actor, userId)) throw ApiError.forbidden("You cannot delete your own account.");
    assertCanManageRole(req.actor, target.role, "delete");
    if (target.role === "owner") await ensureAnotherActiveOwner(pharmacyId, userId);

    await db.delete(pharmacyUsers).where(eq(pharmacyUsers.id, userId));

    res.json({ success: true, message: `${target.name} removed from pharmacy #${pharmacyId}.` });
  } catch (error) {
    next(error);
  }
};
