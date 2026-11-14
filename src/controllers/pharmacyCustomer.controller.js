import { db } from "../db/index.js";
import { pharmacyCustomers } from "../db/schema.js";
import { eq, and, ilike, or, desc, sql } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions } from "../utils/query.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Helper to determine the strictly scoped pharmacy ID
 */
const resolvePharmacyId = (req) => {
  const pId = req.actor?.pharmacyId || Number(req.query.pharmacyId) || Number(req.body?.pharmacyId) || 1001;
  return Number(pId);
};

/**
 * @desc Get customers scoped strictly to this pharmacy
 * @route GET /api/v1/pharmacy-customers
 */
export const getPharmacyCustomers = async (req, res, next) => {
  try {
    const pharmacyId = resolvePharmacyId(req);
    const { page, limit, offset } = getPagination(req.query, 20);
    const { search, isActive } = req.query;

    // Strict pharmacy boundary
    const conditions = [eq(pharmacyCustomers.pharmacyId, pharmacyId)];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(pharmacyCustomers.name, term),
          ilike(pharmacyCustomers.phone, term),
          ilike(pharmacyCustomers.customerCode, term)
        )
      );
    }

    if (isActive !== undefined) {
      conditions.push(eq(pharmacyCustomers.isActive, isActive === "true" || isActive === true));
    }

    const where = combineConditions(conditions);

    const [list, [{ total }]] = await Promise.all([
      db
        .select()
        .from(pharmacyCustomers)
        .where(where)
        .orderBy(desc(pharmacyCustomers.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql`count(*)`.mapWith(Number) }).from(pharmacyCustomers).where(where),
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
 * @desc Get single pharmacy customer by id or phone
 * @route GET /api/v1/pharmacy-customers/:id
 */
export const getPharmacyCustomerById = async (req, res, next) => {
  try {
    const pharmacyId = resolvePharmacyId(req);
    const { id } = req.params;

    const [customer] = await db
      .select()
      .from(pharmacyCustomers)
      .where(
        and(
          eq(pharmacyCustomers.pharmacyId, pharmacyId),
          or(eq(pharmacyCustomers.id, id), eq(pharmacyCustomers.phone, id), eq(pharmacyCustomers.customerCode, id))
        )
      );

    if (!customer) {
      throw ApiError.notFound("Customer not found in this pharmacy.");
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Register or retrieve existing customer scoped to this pharmacy
 * @route POST /api/v1/pharmacy-customers
 */
export const createPharmacyCustomer = async (req, res, next) => {
  try {
    const pharmacyId = resolvePharmacyId(req);
    const {
      name,
      phone,
      email,
      age,
      gender = "Male",
      bloodGroup,
      address,
      refDoctor,
    } = req.body;

    if (!name || !name.trim()) {
      throw ApiError.badRequest("Customer name is required.");
    }
    if (!phone || !phone.trim()) {
      throw ApiError.badRequest("Customer phone number is required.");
    }

    const cleanPhone = phone.trim();

    // Check if customer already exists in THIS pharmacy
    const [existing] = await db
      .select()
      .from(pharmacyCustomers)
      .where(
        and(
          eq(pharmacyCustomers.pharmacyId, pharmacyId),
          eq(pharmacyCustomers.phone, cleanPhone)
        )
      );

    if (existing) {
      // Return existing customer info with 200 OK
      return res.status(200).json({
        success: true,
        message: "Customer already registered in this pharmacy.",
        data: existing,
      });
    }

    // Generate Unique Customer Code for this pharmacy
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const customerCode = `CUST-${pharmacyId}-${randomSuffix}`;
    const id = generateId("cust");

    const [created] = await db
      .insert(pharmacyCustomers)
      .values({
        id,
        pharmacyId,
        customerCode,
        name: name.trim(),
        phone: cleanPhone,
        email: email?.trim() || null,
        age: age ? parseInt(age, 10) : null,
        gender: gender || "Male",
        bloodGroup: bloodGroup || null,
        address: address?.trim() || null,
        refDoctor: refDoctor?.trim() || null,
        totalOrders: 0,
        totalSpent: "0.00",
        isActive: true,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Customer registered successfully for this pharmacy.",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update pharmacy customer
 * @route PUT /api/v1/pharmacy-customers/:id
 */
export const updatePharmacyCustomer = async (req, res, next) => {
  try {
    const pharmacyId = resolvePharmacyId(req);
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      age,
      gender,
      bloodGroup,
      address,
      refDoctor,
      isActive,
    } = req.body;

    const [existing] = await db
      .select()
      .from(pharmacyCustomers)
      .where(and(eq(pharmacyCustomers.pharmacyId, pharmacyId), eq(pharmacyCustomers.id, id)));

    if (!existing) {
      throw ApiError.notFound("Customer not found in this pharmacy.");
    }

    const updateFields = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateFields.name = name.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (email !== undefined) updateFields.email = email ? email.trim() : null;
    if (age !== undefined) updateFields.age = age ? parseInt(age, 10) : null;
    if (gender !== undefined) updateFields.gender = gender;
    if (bloodGroup !== undefined) updateFields.bloodGroup = bloodGroup;
    if (address !== undefined) updateFields.address = address ? address.trim() : null;
    if (refDoctor !== undefined) updateFields.refDoctor = refDoctor ? refDoctor.trim() : null;
    if (isActive !== undefined) updateFields.isActive = Boolean(isActive);

    const [updated] = await db
      .update(pharmacyCustomers)
      .set(updateFields)
      .where(and(eq(pharmacyCustomers.pharmacyId, pharmacyId), eq(pharmacyCustomers.id, id)))
      .returning();

    res.json({
      success: true,
      message: "Customer profile updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete pharmacy customer
 * @route DELETE /api/v1/pharmacy-customers/:id
 */
export const deletePharmacyCustomer = async (req, res, next) => {
  try {
    const pharmacyId = resolvePharmacyId(req);
    const { id } = req.params;

    const [deleted] = await db
      .delete(pharmacyCustomers)
      .where(and(eq(pharmacyCustomers.pharmacyId, pharmacyId), eq(pharmacyCustomers.id, id)))
      .returning();

    if (!deleted) {
      throw ApiError.notFound("Customer not found in this pharmacy.");
    }

    res.json({
      success: true,
      message: "Customer deleted successfully from this pharmacy.",
    });
  } catch (error) {
    next(error);
  }
};

