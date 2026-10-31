import { db } from "../db/index.js";
import { operations } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @desc Get all surgical operations with filtering & pagination
 * @route GET /api/v1/operations
 * @access Private
 */
export const getOperations = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 10);
    const search = getQueryString(req.query, "search");
    const category = getQueryString(req.query, "category");
    const doctorId = getQueryString(req.query, "doctorId");
    const status = getQueryString(req.query, "status");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(operations.name, `%${search}%`),
          ilike(operations.doctorName, `%${search}%`),
          ilike(operations.roomNumber, `%${search}%`),
          ilike(operations.category, `%${search}%`)
        )
      );
    }

    if (category && category !== "all") {
      conditions.push(eq(operations.category, category));
    }

    if (doctorId && doctorId !== "all") {
      conditions.push(eq(operations.doctorId, doctorId));
    }

    if (status && status !== "all") {
      conditions.push(eq(operations.status, status));
    }

    const whereClause = combineConditions(conditions);

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(operations)
      .where(whereClause);

    const result = await db
      .select()
      .from(operations)
      .where(whereClause)
      .orderBy(desc(operations.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: result,
      pagination: buildPaginationMeta(countResult?.count || 0, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get operation by ID
 * @route GET /api/v1/operations/:id
 * @access Private
 */
export const getOperationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [operation] = await db.select().from(operations).where(eq(operations.id, id));

    if (!operation) {
      throw ApiError.notFound(`Operation with ID "${id}" was not found.`);
    }

    res.json({
      success: true,
      data: operation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create surgical operation
 * @route POST /api/v1/operations
 * @access Private (Admin & Staff)
 */
export const createOperation = async (req, res, next) => {
  try {
    const newOperation = {
      id: generateId("op"),
      name: req.body.name,
      category: req.body.category || "General Surgery",
      price: req.body.price ? String(req.body.price) : "15000.00",
      canDiscount: req.body.canDiscount !== undefined ? Boolean(req.body.canDiscount) : true,
      maxDiscountPercent: req.body.maxDiscountPercent ? String(req.body.maxDiscountPercent) : "15.00",
      doctorId: req.body.doctorId || null,
      doctorName: req.body.doctorName || null,
      roomNumber: req.body.roomNumber || null,
      duration: req.body.duration || "60 mins",
      anesthesiaType: req.body.anesthesiaType || "General Anesthesia",
      description: req.body.description || null,
      status: req.body.status || "Active",
    };

    const [created] = await db.insert(operations).values(newOperation).returning();

    res.status(201).json({
      success: true,
      message: `Operation "${created.name}" created successfully.`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update surgical operation
 * @route PUT /api/v1/operations/:id
 * @access Private (Admin & Staff)
 */
export const updateOperation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(operations).where(eq(operations.id, id));
    if (!existing) {
      throw ApiError.notFound(`Operation with ID "${id}" was not found.`);
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    if (req.body.price !== undefined) {
      updateData.price = String(req.body.price);
    }
    if (req.body.maxDiscountPercent !== undefined) {
      updateData.maxDiscountPercent = String(req.body.maxDiscountPercent);
    }

    const [updated] = await db
      .update(operations)
      .set(updateData)
      .where(eq(operations.id, id))
      .returning();

    res.json({
      success: true,
      message: `Operation "${updated.name}" updated successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete surgical operation
 * @route DELETE /api/v1/operations/:id
 * @access Private (Admin Only)
 */
export const deleteOperation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(operations).where(eq(operations.id, id));
    if (!existing) {
      throw ApiError.notFound(`Operation with ID "${id}" was not found.`);
    }

    await db.delete(operations).where(eq(operations.id, id));

    res.json({
      success: true,
      message: `Operation "${existing.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
