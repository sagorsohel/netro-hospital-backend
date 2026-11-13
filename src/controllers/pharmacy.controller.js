import bcrypt from "bcryptjs";
import { db } from "../db/index.js";
import { pharmacies, pharmacyUsers } from "../db/schema.js";
import { and, eq, ilike, or, desc, sql, count, ne } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions } from "../utils/query.js";
import { publicPharmacyUserColumns } from "./pharmacyUser.controller.js";

const findPharmacy = async (pharmacyId) => {
  const [pharmacy] = await db.select().from(pharmacies).where(eq(pharmacies.id, pharmacyId));
  if (!pharmacy) throw ApiError.notFound(`Pharmacy #${pharmacyId} not found.`);
  return pharmacy;
};

const ensureLicenseAvailable = async (licenseNo, excludeId) => {
  const conditions = [eq(pharmacies.licenseNo, licenseNo)];
  if (excludeId) conditions.push(ne(pharmacies.id, excludeId));
  const [existing] = await db.select({ id: pharmacies.id }).from(pharmacies).where(and(...conditions));
  if (existing) throw ApiError.conflict(`License number is already registered to pharmacy #${existing.id}.`);
};

/**
 * @desc Create a pharmacy together with its first owner account
 * @route POST /api/v1/pharmacies
 * @access Hospital Admin
 */
export const createPharmacy = async (req, res, next) => {
  try {
    const { owner, ...fields } = req.body;
    await ensureLicenseAvailable(fields.licenseNo);

    const hashedPassword = await bcrypt.hash(owner.password, 10);

    const result = await db.transaction(async (tx) => {
      const [pharmacy] = await tx
        .insert(pharmacies)
        .values({
          name: fields.name,
          address: fields.address,
          phone: fields.phone,
          email: fields.email || null,
          licenseNo: fields.licenseNo,
          isActive: true,
          createdBy: req.user.id,
        })
        .returning();

      const [ownerUser] = await tx
        .insert(pharmacyUsers)
        .values({
          id: generateId("phu"),
          pharmacyId: pharmacy.id,
          name: owner.name,
          phone: owner.phone,
          email: owner.email || null,
          password: hashedPassword,
          role: "owner",
          isActive: true,
        })
        .returning(publicPharmacyUserColumns);

      return { ...pharmacy, owner: ownerUser };
    });

    res.status(201).json({
      success: true,
      message: `Pharmacy #${result.id} created with owner ${result.owner.name}.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc List pharmacies (search by name / license / phone / numeric ID)
 * @route GET /api/v1/pharmacies
 * @access Hospital Admin
 */
export const getPharmacies = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const { search, isActive } = req.query;

    const conditions = [];
    if (search) {
      const term = `%${search}%`;
      const searchConditions = [
        ilike(pharmacies.name, term),
        ilike(pharmacies.licenseNo, term),
        ilike(pharmacies.phone, term),
      ];
      if (/^\d+$/.test(search)) searchConditions.push(eq(pharmacies.id, Number(search)));
      conditions.push(or(...searchConditions));
    }
    if (isActive !== undefined) conditions.push(eq(pharmacies.isActive, isActive));
    const where = combineConditions(conditions);

    const userCounts = db
      .select({ pharmacyId: pharmacyUsers.pharmacyId, total: count().as("total") })
      .from(pharmacyUsers)
      .groupBy(pharmacyUsers.pharmacyId)
      .as("user_counts");

    const [list, [{ total }]] = await Promise.all([
      db
        .select({
          id: pharmacies.id,
          name: pharmacies.name,
          address: pharmacies.address,
          phone: pharmacies.phone,
          email: pharmacies.email,
          licenseNo: pharmacies.licenseNo,
          isActive: pharmacies.isActive,
          createdAt: pharmacies.createdAt,
          updatedAt: pharmacies.updatedAt,
          userCount: sql`COALESCE(${userCounts.total}, 0)`.mapWith(Number),
        })
        .from(pharmacies)
        .leftJoin(userCounts, eq(userCounts.pharmacyId, pharmacies.id))
        .where(where)
        .orderBy(desc(pharmacies.id))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(pharmacies).where(where),
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
 * @desc Get one pharmacy with its owners and staff counts by role
 * @route GET /api/v1/pharmacies/:pharmacyId
 * @access Hospital Admin
 */
export const getPharmacyById = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    const pharmacy = await findPharmacy(pharmacyId);

    const [owners, roleCounts] = await Promise.all([
      db
        .select(publicPharmacyUserColumns)
        .from(pharmacyUsers)
        .where(and(eq(pharmacyUsers.pharmacyId, pharmacyId), eq(pharmacyUsers.role, "owner"))),
      db
        .select({ role: pharmacyUsers.role, total: count() })
        .from(pharmacyUsers)
        .where(eq(pharmacyUsers.pharmacyId, pharmacyId))
        .groupBy(pharmacyUsers.role),
    ]);

    res.json({
      success: true,
      data: {
        ...pharmacy,
        owners,
        staffByRole: Object.fromEntries(roleCounts.map((r) => [r.role, Number(r.total)])),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update pharmacy details
 * @route PUT /api/v1/pharmacies/:pharmacyId
 * @access Hospital Admin
 */
export const updatePharmacy = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    await findPharmacy(pharmacyId);

    const updates = Object.fromEntries(Object.entries(req.body).filter(([, value]) => value !== undefined));
    if (updates.licenseNo) await ensureLicenseAvailable(updates.licenseNo, pharmacyId);
    if (updates.email === "") updates.email = null;

    const [updated] = await db
      .update(pharmacies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pharmacies.id, pharmacyId))
      .returning();

    res.json({ success: true, message: "Pharmacy updated successfully.", data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Activate / deactivate a pharmacy (deactivated pharmacies cannot log in)
 * @route PATCH /api/v1/pharmacies/:pharmacyId/status
 * @access Hospital Admin
 */
export const updatePharmacyStatus = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    await findPharmacy(pharmacyId);

    const [updated] = await db
      .update(pharmacies)
      .set({ isActive: req.body.isActive, updatedAt: new Date() })
      .where(eq(pharmacies.id, pharmacyId))
      .returning();

    res.json({
      success: true,
      message: `Pharmacy #${pharmacyId} ${updated.isActive ? "activated" : "deactivated"}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Reset the password of the pharmacy's owner (oldest owner if several)
 * @route POST /api/v1/pharmacies/:pharmacyId/reset-owner-password
 * @access Hospital Admin
 */
export const resetOwnerPassword = async (req, res, next) => {
  try {
    const { pharmacyId } = req.params;
    await findPharmacy(pharmacyId);

    const [owner] = await db
      .select({ id: pharmacyUsers.id, name: pharmacyUsers.name })
      .from(pharmacyUsers)
      .where(and(eq(pharmacyUsers.pharmacyId, pharmacyId), eq(pharmacyUsers.role, "owner")))
      .orderBy(pharmacyUsers.createdAt)
      .limit(1);

    if (!owner) throw ApiError.notFound(`Pharmacy #${pharmacyId} has no owner account.`);

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
    await db
      .update(pharmacyUsers)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(pharmacyUsers.id, owner.id));

    res.json({ success: true, message: `Password reset for owner ${owner.name}.` });
  } catch (error) {
    next(error);
  }
};
