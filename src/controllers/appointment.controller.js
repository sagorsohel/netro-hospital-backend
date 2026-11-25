import { db } from "../db/index.js";
import { appointments, doctors, patients } from "../db/schema.js";
import { eq, ne, ilike, or, and, desc, asc, sql } from "drizzle-orm";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { generateId } from "../utils/generateId.js";

/**
 * @desc Get all appointments / doctor serials with search & filters
 * @route GET /api/v1/appointments
 * @access Authenticated
 */
export const getAppointments = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 50);
    const search = getQueryString(req.query, "search");
    const doctorId = getQueryString(req.query, "doctorId");
    const date = getQueryString(req.query, "date");
    const status = getQueryString(req.query, "status");
    const patientPhone = getQueryString(req.query, "patientPhone");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(appointments.patientName, `%${search}%`),
          ilike(appointments.patientPhone, `%${search}%`),
          ilike(appointments.tokenNo, `%${search}%`),
          ilike(appointments.doctorName, `%${search}%`),
          ilike(appointments.roomNumber, `%${search}%`),
          sql`CAST(${appointments.serialNumber} AS TEXT) = ${search}`
        )
      );
    }

    if (patientPhone) {
      conditions.push(ilike(appointments.patientPhone, `%${patientPhone}%`));
    }

    if (doctorId && doctorId !== "all") {
      conditions.push(eq(appointments.doctorId, doctorId));
    }

    if (date && date !== "all") {
      conditions.push(eq(appointments.date, date));
    }

    if (status && status !== "all") {
      conditions.push(eq(appointments.status, status));
    }

    const whereClause = combineConditions(conditions);

    // Total count
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(appointments)
      .where(whereClause);

    const total = Number(countResult.count);

    // Fetch records
    const data = await db
      .select()
      .from(appointments)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(appointments.date), asc(appointments.serialNumber));

    // Optional queue metrics if doctorId and date are provided
    let queueMetrics = null;
    if (doctorId && doctorId !== "all" && date && date !== "all") {
      const allForDoctorDate = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.doctorId, doctorId), eq(appointments.date, date)));

      const waitingList = allForDoctorDate.filter((a) => a.status === "Waiting");
      const currentServing = allForDoctorDate.find((a) => a.status === "In Consultation") || null;
      const completedCount = allForDoctorDate.filter((a) => a.status === "Completed").length;

      queueMetrics = {
        totalBooked: allForDoctorDate.length,
        waitingCount: waitingList.length,
        completedCount,
        currentServingSerial: currentServing?.serialNumber || (waitingList.length > 0 ? waitingList[0].serialNumber : null),
        nextSerialToCall: waitingList.length > 0 ? waitingList[0].serialNumber : null,
      };
    }

    res.json({
      success: true,
      data,
      pagination: buildPaginationMeta(total, page, limit),
      queueMetrics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single appointment by ID
 * @route GET /api/v1/appointments/:id
 * @access Authenticated
 */
export const getAppointmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Look up a serial by scanned barcode (token no) — usable from any module
 * @route GET /api/v1/appointments/token/:tokenNo
 * @access Authenticated
 */
export const getAppointmentByToken = async (req, res, next) => {
  try {
    const code = String(req.params.tokenNo || "").trim();
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(or(ilike(appointments.tokenNo, code), eq(appointments.id, code)))
      .orderBy(desc(appointments.createdAt))
      .limit(1);

    if (!appointment) {
      return res.status(404).json({ success: false, message: `No serial found for barcode ${code}` });
    }

    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create new doctor serial / appointment
 * @route POST /api/v1/appointments
 * @access Authenticated
 */
export const createAppointment = async (req, res, next) => {
  try {
    const payload = req.body;
    const appointmentDate = payload.date || new Date().toISOString().slice(0, 10);

    // Auto-calculate next serial number for this doctor on this date
    let assignedSerial = payload.serialNumber;
    if (!assignedSerial) {
      const existing = await db
        .select({ maxSerial: sql`MAX(${appointments.serialNumber})` })
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, payload.doctorId),
            eq(appointments.date, appointmentDate)
          )
        );

      const maxNum = Number(existing[0]?.maxSerial) || 0;
      assignedSerial = maxNum + 1;
    }

    // Rule: one patient can be booked with only ONE doctor per day (cancelled serials don't count)
    const phoneDigits = (payload.patientPhone || "").replace(/[^0-9]/g, "").slice(-11);
    const patientMatch = [];
    if (payload.patientId) patientMatch.push(eq(appointments.patientId, payload.patientId));
    if (phoneDigits) {
      patientMatch.push(
        and(
          ilike(appointments.patientPhone, `%${phoneDigits}`),
          sql`LOWER(TRIM(${appointments.patientName})) = ${payload.patientName.trim().toLowerCase()}`
        )
      );
    }
    if (patientMatch.length) {
      const [existing] = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.date, appointmentDate),
            ne(appointments.status, "Cancelled"),
            or(...patientMatch)
          )
        )
        .limit(1);

      if (existing) {
        return res.status(409).json({
          success: false,
          message: `${existing.patientName} is already booked with ${existing.doctorName} on ${appointmentDate} (Serial #${existing.serialNumber}, Token ${existing.tokenNo}). A patient cannot be added to another doctor on the same day — cancel that serial first.`,
          data: existing,
        });
      }
    }

    const id = generateId("apt");
    const dateCompact = appointmentDate.replace(/[^0-9]/g, "");
    // Hospital-wide unique token per day (used as the barcode): SRL-YYYYMMDD-NNNN
    const prefix = `SRL-${dateCompact}-`;
    const [tokenRow] = await db
      .select({
        maxSeq: sql`MAX(CAST(SUBSTRING(${appointments.tokenNo} FROM ${prefix.length + 1}) AS INTEGER))`,
      })
      .from(appointments)
      .where(sql`${appointments.tokenNo} ~ ${"^" + prefix + "[0-9]+$"}`);
    const tokenNo =
      payload.tokenNo || `${prefix}${String((Number(tokenRow?.maxSeq) || 0) + 1).padStart(4, "0")}`;

    const newRecord = {
      id,
      tokenNo,
      serialNumber: assignedSerial,
      patientId: payload.patientId || null,
      patientName: payload.patientName,
      patientPhone: payload.patientPhone || null,
      patientAge: payload.patientAge ? parseInt(payload.patientAge) : null,
      patientGender: payload.patientGender || "Male",
      doctorId: payload.doctorId,
      doctorName: payload.doctorName,
      department: payload.department || null,
      roomNumber: payload.roomNumber || null,
      date: appointmentDate,
      time: payload.time || "05:00 PM",
      status: payload.status || "Waiting",
      type: payload.type || "First Visit",
      fee: payload.fee !== undefined ? String(payload.fee) : "1000.00",
      discount: payload.discount !== undefined ? String(payload.discount) : "0.00",
      paidAmount: payload.paidAmount !== undefined ? String(payload.paidAmount) : "1000.00",
      dueAmount: payload.dueAmount !== undefined ? String(payload.dueAmount) : "0.00",
      paymentStatus: payload.paymentStatus || "Paid",
      paymentMethod: payload.paymentMethod || "Cash",
      symptoms: payload.symptoms || null,
    };

    const [created] = await db
      .insert(appointments)
      .values(newRecord)
      .returning();

    res.status(201).json({
      success: true,
      message: `Serial #${assignedSerial} allocated successfully`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update appointment status (Waiting -> In Consultation -> Completed -> Cancelled)
 * @route PATCH /api/v1/appointments/:id/status
 * @access Authenticated
 */
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [updated] = await db
      .update(appointments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      message: `Status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete / Cancel appointment
 * @route DELETE /api/v1/appointments/:id
 * @access Authenticated
 */
export const deleteAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(appointments)
      .where(eq(appointments.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      message: "Appointment deleted successfully",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

