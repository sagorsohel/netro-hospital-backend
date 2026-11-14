import { db } from "../db/index.js";
import { medicines } from "../db/schema.js";
import { eq, ilike, or, desc, sql, lte } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions } from "../utils/query.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @desc Get all medicines (search, category, lowStock filter, pagination)
 * @route GET /api/v1/medicines
 */
export const getMedicines = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 12);
    const { search, category, lowStock } = req.query;

    const conditions = [];

    if (search) {
      const term = `%${search}%`;
      conditions.push(
        or(
          ilike(medicines.name, term),
          ilike(medicines.generic, term),
          ilike(medicines.category, term),
          ilike(medicines.batchNo, term),
          ilike(medicines.supplier, term)
        )
      );
    }

    if (category && category !== "all") {
      conditions.push(eq(medicines.category, category));
    }

    if (lowStock === "true" || lowStock === true) {
      conditions.push(lte(medicines.totalPieces, medicines.minThresholdPieces));
    }

    const where = combineConditions(conditions);

    const [list, [{ total }]] = await Promise.all([
      db
        .select()
        .from(medicines)
        .where(where)
        .orderBy(desc(medicines.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql`count(*)`.mapWith(Number) }).from(medicines).where(where),
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
 * @desc Get single medicine by id
 * @route GET /api/v1/medicines/:id
 */
export const getMedicineById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [item] = await db.select().from(medicines).where(eq(medicines.id, id));
    if (!item) throw ApiError.notFound("Medicine not found.");
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create / Stock-in a new medicine
 * @route POST /api/v1/medicines
 */
export const createMedicine = async (req, res, next) => {
  try {
    const {
      name,
      generic,
      category,
      cartonQty = 0,
      packetPerCarton = 10,
      piecePerPacket = 10,
      unitSellingPrice,
      stripSellingPrice,
      batchNo,
      expiryDate,
      minThresholdPieces = 100,
      supplier,
      branch = "Main Hospital Pharmacy",
    } = req.body;

    const totalPieces =
      req.body.totalPieces !== undefined
        ? Number(req.body.totalPieces)
        : Number(cartonQty) * Number(packetPerCarton) * Number(piecePerPacket);

    const [created] = await db
      .insert(medicines)
      .values({
        id: generateId("med"),
        name,
        generic,
        category,
        cartonQty: Number(cartonQty),
        packetPerCarton: Number(packetPerCarton),
        piecePerPacket: Number(piecePerPacket),
        totalPieces,
        unitSellingPrice: String(unitSellingPrice),
        stripSellingPrice: String(stripSellingPrice || Number(unitSellingPrice) * Number(piecePerPacket)),
        batchNo: batchNo || `BATCH-${Date.now().toString().slice(-4)}`,
        expiryDate: expiryDate || "2027-12-31",
        minThresholdPieces: Number(minThresholdPieces),
        supplier: supplier || "Direct Supply",
        branch,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: `${created.name} added to inventory.`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update a medicine
 * @route PUT /api/v1/medicines/:id
 */
export const updateMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(medicines).where(eq(medicines.id, id));
    if (!existing) throw ApiError.notFound("Medicine not found.");

    const updates = { ...req.body };
    if (updates.cartonQty !== undefined || updates.packetPerCarton !== undefined || updates.piecePerPacket !== undefined) {
      const cQty = updates.cartonQty !== undefined ? Number(updates.cartonQty) : existing.cartonQty;
      const pPerC = updates.packetPerCarton !== undefined ? Number(updates.packetPerCarton) : existing.packetPerCarton;
      const pcPerP = updates.piecePerPacket !== undefined ? Number(updates.piecePerPacket) : existing.piecePerPacket;
      if (updates.totalPieces === undefined) {
        updates.totalPieces = cQty * pPerC * pcPerP;
      }
    }

    const [updated] = await db
      .update(medicines)
      .set(updates)
      .where(eq(medicines.id, id))
      .returning();

    res.json({ success: true, message: "Medicine updated.", data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete a medicine
 * @route DELETE /api/v1/medicines/:id
 */
export const deleteMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(medicines).where(eq(medicines.id, id)).returning({ id: medicines.id });
    if (!deleted) throw ApiError.notFound("Medicine not found.");
    res.json({ success: true, message: "Medicine removed from stock." });
  } catch (error) {
    next(error);
  }
};

