import { db } from "../db/index.js";
import { rooms } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @desc Get all hospital rooms with filtering & pagination
 * @route GET /api/v1/rooms
 * @access Private
 */
export const getRooms = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 12);
    const search = getQueryString(req.query, "search");
    const floor = getQueryString(req.query, "floor");
    const status = getQueryString(req.query, "status");
    const roomType = getQueryString(req.query, "roomType");
    const department = getQueryString(req.query, "department");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(rooms.name, `%${search}%`),
          ilike(rooms.roomNumber, `%${search}%`),
          ilike(rooms.patientName, `%${search}%`)
        )
      );
    }

    if (floor && floor !== "all") {
      conditions.push(eq(rooms.floor, floor));
    }

    if (status && status !== "all") {
      conditions.push(eq(rooms.status, status));
    }

    if (roomType && roomType !== "all") {
      conditions.push(eq(rooms.roomType, roomType));
    }

    if (department && department !== "all") {
      conditions.push(eq(rooms.department, department));
    }

    const whereClause = combineConditions(conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(rooms)
      .where(whereClause);

    // Get paginated rooms
    const result = await db
      .select()
      .from(rooms)
      .where(whereClause)
      .orderBy(desc(rooms.createdAt))
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
 * @desc Get Room & Bed KPIs / Metrics
 * @route GET /api/v1/rooms/stats
 * @access Private
 */
export const getRoomStats = async (req, res, next) => {
  try {
    const allRooms = await db.select().from(rooms);

    const totalRooms = allRooms.length;
    let totalBeds = 0;
    let occupiedBeds = 0;
    let availableRooms = 0;
    let bookedRooms = 0;
    let maintenanceRooms = 0;

    const floorCounts = {};
    const typeCounts = {};

    for (const r of allRooms) {
      const beds = Number(r.bedCount) || 1;
      const occ = Number(r.occupiedBeds) || 0;
      totalBeds += beds;
      occupiedBeds += occ;

      if (r.status === "Available") availableRooms++;
      else if (r.status === "Booked") bookedRooms++;
      else maintenanceRooms++;

      floorCounts[r.floor] = (floorCounts[r.floor] || 0) + 1;
      typeCounts[r.roomType] = (typeCounts[r.roomType] || 0) + 1;
    }

    const availableBeds = Math.max(0, totalBeds - occupiedBeds);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    res.json({
      success: true,
      stats: {
        totalRooms,
        totalBeds,
        availableBeds,
        occupiedBeds,
        availableRooms,
        bookedRooms,
        maintenanceRooms,
        occupancyRate,
        floorCounts,
        typeCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get room by ID
 * @route GET /api/v1/rooms/:id
 * @access Private
 */
export const getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));

    if (!room) {
      throw ApiError.notFound(`Room with ID "${id}" was not found.`);
    }

    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create new hospital room / ward
 * @route POST /api/v1/rooms
 * @access Private (Admin & Staff)
 */
export const createRoom = async (req, res, next) => {
  try {
    const newRoom = {
      id: generateId("rm"),
      name: req.body.name,
      roomNumber: req.body.roomNumber,
      floor: req.body.floor,
      roomType: req.body.roomType || "General Ward",
      department: req.body.department || "Inpatient (IPD)",
      perDayCharge: req.body.perDayCharge ? String(req.body.perDayCharge) : "1500.00",
      bedCount: req.body.bedCount !== undefined ? Number(req.body.bedCount) : 1,
      occupiedBeds: req.body.occupiedBeds !== undefined ? Number(req.body.occupiedBeds) : 0,
      status: req.body.status || "Available",
      patientName: req.body.patientName || null,
      admissionId: req.body.admissionId || null,
      bedNumbers: req.body.bedNumbers || [],
      extraCharges: req.body.extraCharges || [],
      amenities: req.body.amenities || [],
      notes: req.body.notes || null,
    };

    const [created] = await db.insert(rooms).values(newRoom).returning();

    res.status(201).json({
      success: true,
      message: `Room "${created.name} (#${created.roomNumber})" created successfully.`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update hospital room
 * @route PUT /api/v1/rooms/:id
 * @access Private (Admin & Staff)
 */
export const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(rooms).where(eq(rooms.id, id));
    if (!existing) {
      throw ApiError.notFound(`Room with ID "${id}" was not found.`);
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    if (req.body.perDayCharge !== undefined) {
      updateData.perDayCharge = String(req.body.perDayCharge);
    }

    const [updated] = await db
      .update(rooms)
      .set(updateData)
      .where(eq(rooms.id, id))
      .returning();

    res.json({
      success: true,
      message: `Room "${updated.name}" updated successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Quick status toggle (Available, Booked, Maintenance, Cleaning)
 * @route PATCH /api/v1/rooms/:id/status
 * @access Private
 */
export const toggleRoomStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, patientName, admissionId, occupiedBeds } = req.body;

    const [existing] = await db.select().from(rooms).where(eq(rooms.id, id));
    if (!existing) {
      throw ApiError.notFound(`Room with ID "${id}" was not found.`);
    }

    const updatePayload = {
      status,
      updatedAt: new Date(),
    };

    if (status === "Available") {
      updatePayload.patientName = null;
      updatePayload.admissionId = null;
      updatePayload.occupiedBeds = 0;
    } else {
      if (patientName !== undefined) updatePayload.patientName = patientName;
      if (admissionId !== undefined) updatePayload.admissionId = admissionId;
      if (occupiedBeds !== undefined) updatePayload.occupiedBeds = Number(occupiedBeds);
      else if (status === "Booked" && Number(existing.occupiedBeds) === 0) {
        updatePayload.occupiedBeds = 1;
      }
    }

    const [updated] = await db
      .update(rooms)
      .set(updatePayload)
      .where(eq(rooms.id, id))
      .returning();

    res.json({
      success: true,
      message: `Room status changed to ${status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete hospital room
 * @route DELETE /api/v1/rooms/:id
 * @access Private (Admin Only)
 */
export const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(rooms).where(eq(rooms.id, id));
    if (!existing) {
      throw ApiError.notFound(`Room with ID "${id}" was not found.`);
    }

    await db.delete(rooms).where(eq(rooms.id, id));

    res.json({
      success: true,
      message: `Room "${existing.name} (#${existing.roomNumber})" has been deleted.`,
    });
  } catch (error) {
    next(error);
  }
};
