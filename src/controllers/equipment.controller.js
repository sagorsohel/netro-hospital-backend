import { db } from "../db/index.js";
import { equipment, maintenanceLogs } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { generateId } from "../utils/generateId.js";

// ==========================================
// 1. EQUIPMENT INVENTORY & STATUS
// ==========================================

export const getEquipment = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 10);
    const search = getQueryString(req.query, "search");
    const category = getQueryString(req.query, "category");
    const status = getQueryString(req.query, "status");
    const department = getQueryString(req.query, "department");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(equipment.name, `%${search}%`),
          ilike(equipment.modelNo, `%${search}%`),
          ilike(equipment.serialNumber, `%${search}%`),
          ilike(equipment.roomNumber, `%${search}%`),
          ilike(equipment.manufacturer, `%${search}%`)
        )
      );
    }

    if (category && category !== "all") {
      conditions.push(ilike(equipment.category, category));
    }

    if (status && status !== "all") {
      conditions.push(eq(equipment.status, status));
    }

    if (department && department !== "all") {
      conditions.push(ilike(equipment.department, department));
    }

    const whereClause = combineConditions(conditions);

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(equipment)
      .where(whereClause);

    const list = await db
      .select()
      .from(equipment)
      .where(whereClause)
      .orderBy(desc(equipment.createdAt))
      .limit(limit)
      .offset(offset);

    return res.status(200).json({
      success: true,
      data: list,
      pagination: buildPaginationMeta(countResult?.count, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getEquipmentStats = async (req, res, next) => {
  try {
    const [totalRes] = await db.select({ count: sql`count(*)` }).from(equipment);
    const [functionalRes] = await db
      .select({ count: sql`count(*)` })
      .from(equipment)
      .where(eq(equipment.status, "Functional"));
    const [maintenanceRes] = await db
      .select({ count: sql`count(*)` })
      .from(equipment)
      .where(eq(equipment.status, "Under Maintenance"));
    const [brokenRes] = await db
      .select({ count: sql`count(*)` })
      .from(equipment)
      .where(eq(equipment.status, "Non-functional"));

    return res.status(200).json({
      success: true,
      stats: {
        total: parseInt(totalRes?.count || "0", 10),
        functional: parseInt(functionalRes?.count || "0", 10),
        underMaintenance: parseInt(maintenanceRes?.count || "0", 10),
        nonFunctional: parseInt(brokenRes?.count || "0", 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEquipmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [item] = await db.select().from(equipment).where(eq(equipment.id, id));

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated & trimmed by createEquipmentSchema
export const createEquipment = async (req, res, next) => {
  try {
    const { quantity, status, ...item } = req.body;

    const [newItem] = await db
      .insert(equipment)
      .values({
        ...item,
        id: generateId("eq"),
        quantity: quantity || 1,
        status: status || "Functional",
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Equipment registered successfully.",
      data: newItem,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated by updateEquipmentSchema (unknown fields are stripped)
export const updateEquipment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(equipment).where(eq(equipment.id, id));

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    const [updated] = await db
      .update(equipment)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(equipment.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Equipment updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEquipment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(equipment).where(eq(equipment.id, id)).returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Equipment deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. MAINTENANCE HISTORY & SERVICING LOGS
// ==========================================

export const getMaintenanceLogs = async (req, res, next) => {
  try {
    const equipmentId = getQueryString(req.query, "equipmentId");
    const conditions = [];

    if (equipmentId) {
      conditions.push(eq(maintenanceLogs.equipmentId, equipmentId));
    }

    const logs = await db
      .select()
      .from(maintenanceLogs)
      .where(combineConditions(conditions))
      .orderBy(desc(maintenanceLogs.serviceDate));

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated & trimmed by createMaintenanceLogSchema
export const createMaintenanceLog = async (req, res, next) => {
  try {
    const { cost, statusAfterService, ...log } = req.body;
    const statusAfter = statusAfterService || "Functional";

    const [newLog] = await db
      .insert(maintenanceLogs)
      .values({
        ...log,
        id: generateId("log"),
        cost: cost !== undefined ? String(cost) : "0.00",
        statusAfterService: statusAfter,
      })
      .returning();

    // Automatically update the main equipment record with new service dates and status
    await db
      .update(equipment)
      .set({
        status: statusAfter,
        lastServiceDate: log.serviceDate,
        nextServiceDate: log.nextScheduledDate,
        updatedAt: new Date(),
      })
      .where(eq(equipment.id, log.equipmentId));

    return res.status(201).json({
      success: true,
      message: "Maintenance log registered and equipment status updated.",
      data: newLog,
    });
  } catch (error) {
    next(error);
  }
};
