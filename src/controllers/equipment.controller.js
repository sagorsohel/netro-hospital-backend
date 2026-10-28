import { db } from "../db/index.js";
import { equipment, maintenanceLogs } from "../db/schema.js";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";

// ==========================================
// 1. EQUIPMENT INVENTORY & STATUS
// ==========================================

export const getEquipment = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : "";
    const category = req.query.category ? req.query.category.trim() : "";
    const status = req.query.status ? req.query.status.trim() : "";
    const department = req.query.department ? req.query.department.trim() : "";

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

    const whereClause =
      conditions.length === 1
        ? conditions[0]
        : conditions.length > 1
        ? and(...conditions)
        : undefined;

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(equipment)
      .where(whereClause);

    const total = parseInt(countResult?.count || "0", 10);
    const totalPages = Math.ceil(total / limit) || 1;

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
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
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

export const createEquipment = async (req, res, next) => {
  try {
    const {
      name,
      modelNo,
      serialNumber,
      category,
      quantity,
      roomNumber,
      floor,
      department,
      manufacturer,
      purchaseDate,
      warrantyExpiry,
      status,
      lastServiceDate,
      nextServiceDate,
      serviceNotes,
      technicianContact,
      photo,
    } = req.body;

    if (!name || !category || !department) {
      return res.status(400).json({
        success: false,
        message: "Equipment name, category, and department are required.",
      });
    }

    const id = `eq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const [newItem] = await db
      .insert(equipment)
      .values({
        id,
        name: name.trim(),
        modelNo: modelNo ? modelNo.trim() : undefined,
        serialNumber: serialNumber ? serialNumber.trim() : undefined,
        category: category.trim(),
        quantity: parseInt(quantity) || 1,
        roomNumber: roomNumber ? roomNumber.trim() : undefined,
        floor: floor ? floor.trim() : undefined,
        department: department.trim(),
        manufacturer: manufacturer ? manufacturer.trim() : undefined,
        purchaseDate: purchaseDate || undefined,
        warrantyExpiry: warrantyExpiry || undefined,
        status: status || "Functional",
        lastServiceDate: lastServiceDate || undefined,
        nextServiceDate: nextServiceDate || undefined,
        serviceNotes: serviceNotes ? serviceNotes.trim() : undefined,
        technicianContact: technicianContact ? technicianContact.trim() : undefined,
        photo: photo ? photo.trim() : undefined,
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

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    if (updateData.quantity) {
      updateData.quantity = parseInt(updateData.quantity);
    }

    const [updated] = await db
      .update(equipment)
      .set(updateData)
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
    const { equipmentId } = req.query;
    const conditions = [];

    if (equipmentId) {
      conditions.push(eq(maintenanceLogs.equipmentId, equipmentId));
    }

    const whereClause = conditions.length > 0 ? conditions[0] : undefined;

    const logs = await db
      .select()
      .from(maintenanceLogs)
      .where(whereClause)
      .orderBy(desc(maintenanceLogs.serviceDate));

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

export const createMaintenanceLog = async (req, res, next) => {
  try {
    const {
      equipmentId,
      equipmentName,
      serviceDate,
      servicedBy,
      cost,
      description,
      statusAfterService,
      nextScheduledDate,
    } = req.body;

    if (!equipmentId || !equipmentName || !serviceDate || !servicedBy || !description) {
      return res.status(400).json({
        success: false,
        message: "Equipment ID, name, service date, serviced by, and description are required.",
      });
    }

    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const [newLog] = await db
      .insert(maintenanceLogs)
      .values({
        id,
        equipmentId,
        equipmentName: equipmentName.trim(),
        serviceDate: serviceDate.trim(),
        servicedBy: servicedBy.trim(),
        cost: cost ? String(cost) : "0.00",
        description: description.trim(),
        statusAfterService: statusAfterService || "Functional",
        nextScheduledDate: nextScheduledDate ? nextScheduledDate.trim() : undefined,
      })
      .returning();

    // Automatically update the main equipment record with new service dates and status
    await db
      .update(equipment)
      .set({
        status: statusAfterService || "Functional",
        lastServiceDate: serviceDate.trim(),
        nextServiceDate: nextScheduledDate ? nextScheduledDate.trim() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(equipment.id, equipmentId));

    return res.status(201).json({
      success: true,
      message: "Maintenance log registered and equipment status updated.",
      data: newLog,
    });
  } catch (error) {
    next(error);
  }
};
