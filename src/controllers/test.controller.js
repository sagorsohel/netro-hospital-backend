import { db } from "../db/index.js";
import { diagnosticTests } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @desc Get all diagnostic & lab tests with filtering & pagination
 * @route GET /api/v1/tests
 * @access Private
 */
export const getTests = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 10);
    const search = getQueryString(req.query, "search");
    const category = getQueryString(req.query, "category");
    const status = getQueryString(req.query, "status");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(diagnosticTests.name, `%${search}%`),
          ilike(diagnosticTests.code, `%${search}%`),
          ilike(diagnosticTests.category, `%${search}%`),
          ilike(diagnosticTests.roomNumber, `%${search}%`)
        )
      );
    }

    if (category && category !== "all") {
      conditions.push(eq(diagnosticTests.category, category));
    }

    if (status && status !== "all") {
      conditions.push(eq(diagnosticTests.status, status));
    }

    const whereClause = combineConditions(conditions);

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(diagnosticTests)
      .where(whereClause);

    const result = await db
      .select()
      .from(diagnosticTests)
      .where(whereClause)
      .orderBy(desc(diagnosticTests.createdAt))
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
 * @desc Get test by ID
 * @route GET /api/v1/tests/:id
 * @access Private
 */
export const getTestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [test] = await db.select().from(diagnosticTests).where(eq(diagnosticTests.id, id));

    if (!test) {
      throw ApiError.notFound(`Diagnostic test with ID "${id}" was not found.`);
    }

    res.json({
      success: true,
      data: test,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create diagnostic / lab test
 * @route POST /api/v1/tests
 * @access Private (Admin & Staff)
 */
export const createTest = async (req, res, next) => {
  try {
    const newTest = {
      id: generateId("test"),
      name: req.body.name,
      code: req.body.code || null,
      category: req.body.category || "Pathology",
      price: req.body.price ? String(req.body.price) : "500.00",
      isDiscountable: req.body.isDiscountable !== undefined ? Boolean(req.body.isDiscountable) : true,
      discountPercent: req.body.discountPercent ? String(req.body.discountPercent) : "10.00",
      roomNumber: req.body.roomNumber || null,
      sampleType: req.body.sampleType || "Blood",
      deliveryTime: req.body.deliveryTime || "Same Day (4 Hours)",
      normalRange: req.body.normalRange || null,
      description: req.body.description || null,
      status: req.body.status || "Active",
    };

    const [created] = await db.insert(diagnosticTests).values(newTest).returning();

    res.status(201).json({
      success: true,
      message: `Diagnostic test "${created.name}" created successfully.`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update diagnostic / lab test
 * @route PUT /api/v1/tests/:id
 * @access Private (Admin & Staff)
 */
export const updateTest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(diagnosticTests).where(eq(diagnosticTests.id, id));
    if (!existing) {
      throw ApiError.notFound(`Diagnostic test with ID "${id}" was not found.`);
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    if (req.body.price !== undefined) {
      updateData.price = String(req.body.price);
    }
    if (req.body.discountPercent !== undefined) {
      updateData.discountPercent = String(req.body.discountPercent);
    }

    const [updated] = await db
      .update(diagnosticTests)
      .set(updateData)
      .where(eq(diagnosticTests.id, id))
      .returning();

    res.json({
      success: true,
      message: `Diagnostic test "${updated.name}" updated successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete diagnostic / lab test
 * @route DELETE /api/v1/tests/:id
 * @access Private (Admin Only)
 */
export const deleteTest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(diagnosticTests).where(eq(diagnosticTests.id, id));
    if (!existing) {
      throw ApiError.notFound(`Diagnostic test with ID "${id}" was not found.`);
    }

    await db.delete(diagnosticTests).where(eq(diagnosticTests.id, id));

    res.json({
      success: true,
      message: `Diagnostic test "${existing.name}" deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
