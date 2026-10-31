import { db } from "../db/index.js";
import { admissions, patients, rooms, operations } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Generate unique Admission Number e.g. ADM-2026-0003
 */
async function generateUniqueAdmissionNo() {
  const currentYear = new Date().getFullYear();
  const [countRes] = await db.select({ count: sql`count(*)` }).from(admissions);
  const nextNum = Number(countRes?.count || 0) + 1;
  const candidate = `ADM-${currentYear}-${String(nextNum).padStart(4, "0")}`;

  const [existing] = await db
    .select({ id: admissions.id })
    .from(admissions)
    .where(eq(admissions.admissionNo, candidate))
    .limit(1);

  if (!existing) return candidate;
  return `ADM-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Generate unique Patient ID e.g. PAT-2026-0005
 */
async function generateUniquePatientId() {
  const currentYear = new Date().getFullYear();
  const [countRes] = await db.select({ count: sql`count(*)` }).from(patients);
  const nextNum = Number(countRes?.count || 0) + 1;
  const candidate = `PAT-${currentYear}-${String(nextNum).padStart(4, "0")}`;

  const [existing] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(eq(patients.patientId, candidate))
    .limit(1);

  if (!existing) return candidate;
  return `PAT-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * @desc Get all admissions with filtering & pagination
 * @route GET /api/v1/admissions
 * @access Private
 */
export const getAdmissions = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 10);
    const search = getQueryString(req.query, "search");
    const status = getQueryString(req.query, "status");
    const roomId = getQueryString(req.query, "roomId");
    const doctorId = getQueryString(req.query, "doctorId");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(admissions.admissionNo, `%${search}%`),
          ilike(admissions.patientName, `%${search}%`),
          ilike(admissions.patientPhone, `%${search}%`),
          ilike(admissions.roomNumber, `%${search}%`),
          ilike(admissions.doctorName, `%${search}%`),
          ilike(admissions.patientUniqueId, `%${search}%`)
        )
      );
    }

    if (status && status !== "all") {
      conditions.push(eq(admissions.status, status));
    }

    if (roomId && roomId !== "all") {
      conditions.push(eq(admissions.roomId, roomId));
    }

    if (doctorId && doctorId !== "all") {
      conditions.push(eq(admissions.doctorId, doctorId));
    }

    const whereClause = combineConditions(conditions);

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(admissions)
      .where(whereClause);

    const list = await db
      .select()
      .from(admissions)
      .where(whereClause)
      .orderBy(desc(admissions.admissionDate))
      .limit(limit)
      .offset(offset);

    const meta = buildPaginationMeta(countResult.count, page, limit);

    res.status(200).json({
      success: true,
      data: list,
      meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single admission by ID with full details
 * @route GET /api/v1/admissions/:id
 * @access Private
 */
export const getAdmissionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [admission] = await db
      .select()
      .from(admissions)
      .where(or(eq(admissions.id, id), eq(admissions.admissionNo, id)))
      .limit(1);

    if (!admission) {
      throw ApiError.notFound(`Admission record "${id}" not found`);
    }

    // Fetch associated patient profile details
    let patientProfile = null;
    if (admission.patientId) {
      const [p] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, admission.patientId))
        .limit(1);
      patientProfile = p || null;
    }

    res.status(200).json({
      success: true,
      data: {
        ...admission,
        patientProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create new admission (auto-create patient profile if new, assign room & bed, generate POS bill)
 * @route POST /api/v1/admissions
 * @access Private
 */
export const createAdmission = async (req, res, next) => {
  try {
    const body = req.body;
    let patientRecord = null;

    // 1. Check if registering as a new patient or linking existing
    const isNewPatient = body.isNewPatient === true || !body.patientId;

    if (isNewPatient) {
      // Auto-create permanent digital patient profile!
      const generatedPatientId = await generateUniquePatientId();
      const internalPatientId = generateId("pat");

      const newPatientData = {
        id: internalPatientId,
        patientId: generatedPatientId,
        name: (body.patientName || body.name || "Unknown Patient").trim(),
        age: body.patientAge ? Number(body.patientAge) : (body.age ? Number(body.age) : null),
        dob: body.dob || null,
        gender: body.patientGender || body.gender || "Other",
        phone: (body.patientPhone || body.phone || "").trim(),
        email: body.patientEmail || body.email || null,
        bloodGroup: body.patientBloodGroup || body.bloodGroup || null,
        address: body.patientAddress || body.address || null,
        guardianName: body.guardianName || null,
        guardianPhone: body.guardianPhone || null,
        guardianRelation: body.guardianRelation || null,
        emergencyContact: body.emergencyContact || null,
        maritalStatus: body.maritalStatus || "Single",
        occupation: body.occupation || null,
        allergies: body.allergies || null,
        status: "Admitted",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [createdPatient] = await db
        .insert(patients)
        .values(newPatientData)
        .returning();
      patientRecord = createdPatient;
    } else {
      // Existing patient lookup
      const [existingPatient] = await db
        .select()
        .from(patients)
        .where(or(eq(patients.id, body.patientId), eq(patients.patientId, body.patientId)))
        .limit(1);

      if (!existingPatient) {
        throw ApiError.notFound(`Existing patient "${body.patientId}" not found`);
      }

      // Update patient status to Admitted
      await db
        .update(patients)
        .set({ status: "Admitted", updatedAt: new Date() })
        .where(eq(patients.id, existingPatient.id));

      patientRecord = existingPatient;
    }

    // 2. Room & Bed Allocation
    let roomDetails = null;
    if (body.roomId) {
      const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, body.roomId))
        .limit(1);

      if (room) {
        roomDetails = room;
      }
    }

    // 3. Surgical Operation details lookup
    let opDetails = null;
    if (body.operationId) {
      const [op] = await db
        .select()
        .from(operations)
        .where(eq(operations.id, body.operationId))
        .limit(1);
      if (op) {
        opDetails = op;
      }
    }

    // 4. POS Billing Calculations
    const admissionFee = parseFloat(body.admissionFee ?? 500);
    const perDayCharge = parseFloat(
      body.perDayCharge ?? (roomDetails ? roomDetails.perDayCharge : 1500)
    );
    const roomCharge = perDayCharge; // initial 1st day charge
    const operationCharge = opDetails
      ? parseFloat(opDetails.price)
      : parseFloat(body.operationPrice ?? 0);

    // Extra charges calculation
    const extraCharges = Array.isArray(body.extraCharges) ? body.extraCharges : [];
    const extraChargesTotal = extraCharges.reduce(
      (sum, item) => sum + (parseFloat(item.value) || 0),
      0
    );

    const subtotal = admissionFee + roomCharge + operationCharge + extraChargesTotal;
    const discountAmount = parseFloat(body.discountAmount ?? 0);
    const grandTotal = Math.max(0, subtotal - discountAmount);
    const advancePayment = parseFloat(body.advancePayment ?? 0);
    const dueAmount = Math.max(0, grandTotal - advancePayment);

    const paymentStatus =
      dueAmount <= 0
        ? "Paid"
        : advancePayment > 0
        ? "Partial"
        : "Due";

    // 5. Generate unique Admission Number
    const admissionNo = await generateUniqueAdmissionNo();
    const admissionId = generateId("adm");

    const newAdmission = {
      id: admissionId,
      admissionNo,
      patientId: patientRecord.id,
      patientUniqueId: patientRecord.patientId,
      patientName: patientRecord.name,
      patientPhone: patientRecord.phone,
      patientAge: patientRecord.age,
      patientGender: patientRecord.gender,
      guardianName: body.guardianName || patientRecord.guardianName || null,
      guardianPhone: body.guardianPhone || patientRecord.guardianPhone || null,
      guardianRelation: body.guardianRelation || patientRecord.guardianRelation || null,
      admissionDate: new Date(),
      status: "Admitted",

      // Room & Bed
      roomId: roomDetails ? roomDetails.id : (body.roomId || null),
      roomNumber: roomDetails ? roomDetails.roomNumber : (body.roomNumber || null),
      roomName: roomDetails ? roomDetails.name : (body.roomName || null),
      bedNumber: body.bedNumber || (roomDetails?.bedNumbers?.[0] ?? "Bed 1"),
      perDayCharge: perDayCharge.toFixed(2),

      // Doctor & Dept
      doctorId: body.doctorId || null,
      doctorName: body.doctorName || null,
      department: body.department || (roomDetails ? roomDetails.department : null),

      // Operation
      operationId: opDetails ? opDetails.id : (body.operationId || null),
      operationName: opDetails ? opDetails.name : (body.operationName || null),
      operationPrice: operationCharge.toFixed(2),

      // POS Billing Financials
      extraCharges: extraCharges,
      admissionFee: admissionFee.toFixed(2),
      roomCharge: roomCharge.toFixed(2),
      operationCharge: operationCharge.toFixed(2),
      extraChargesTotal: extraChargesTotal.toFixed(2),
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      advancePayment: advancePayment.toFixed(2),
      dueAmount: dueAmount.toFixed(2),
      paymentMethod: body.paymentMethod || "Cash",
      paymentStatus,

      // Clinical
      diagnosis: body.diagnosis || null,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdAdmission] = await db
      .insert(admissions)
      .values(newAdmission)
      .returning();

    // 6. Update Room occupancy & status
    if (roomDetails) {
      const newOccupiedCount = (roomDetails.occupiedBeds || 0) + 1;
      const isNowFull = newOccupiedCount >= (roomDetails.bedCount || 1);

      await db
        .update(rooms)
        .set({
          occupiedBeds: newOccupiedCount,
          patientName: patientRecord.name,
          admissionId: admissionNo,
          status: isNowFull ? "Booked" : roomDetails.status,
          updatedAt: new Date(),
        })
        .where(eq(rooms.id, roomDetails.id));
    }

    res.status(201).json({
      success: true,
      message: `Admission ${admissionNo} created successfully. Patient profile: ${patientRecord.patientId}`,
      data: {
        admission: createdAdmission,
        patient: patientRecord,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Discharge patient (free room bed, update patient status, finalize bill)
 * @route POST /api/v1/admissions/:id/discharge
 * @access Private
 */
export const dischargeAdmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dischargeNotes, settleDue, finalPaymentMethod } = req.body;

    const [admission] = await db
      .select()
      .from(admissions)
      .where(or(eq(admissions.id, id), eq(admissions.admissionNo, id)))
      .limit(1);

    if (!admission) {
      throw ApiError.notFound(`Admission record "${id}" not found`);
    }

    if (admission.status === "Discharged") {
      throw ApiError.badRequest("This patient has already been discharged");
    }

    // Update admission record
    const updatedAdmissionFields = {
      status: "Discharged",
      dischargeDate: new Date(),
      updatedAt: new Date(),
      ...(dischargeNotes && {
        notes: admission.notes
          ? `${admission.notes}\n[Discharge Note]: ${dischargeNotes}`
          : `[Discharge Note]: ${dischargeNotes}`,
      }),
    };

    if (settleDue) {
      updatedAdmissionFields.advancePayment = admission.grandTotal;
      updatedAdmissionFields.dueAmount = "0.00";
      updatedAdmissionFields.paymentStatus = "Paid";
      if (finalPaymentMethod) {
        updatedAdmissionFields.paymentMethod = finalPaymentMethod;
      }
    }

    const [updatedAdmission] = await db
      .update(admissions)
      .set(updatedAdmissionFields)
      .where(eq(admissions.id, admission.id))
      .returning();

    // Free Room bed occupancy
    if (admission.roomId) {
      const [room] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, admission.roomId))
        .limit(1);

      if (room) {
        const updatedOccupied = Math.max(0, (room.occupiedBeds || 1) - 1);
        await db
          .update(rooms)
          .set({
            occupiedBeds: updatedOccupied,
            patientName: updatedOccupied === 0 ? null : room.patientName,
            admissionId: updatedOccupied === 0 ? null : room.admissionId,
            status: updatedOccupied === 0 ? "Available" : room.status,
            updatedAt: new Date(),
          })
          .where(eq(rooms.id, room.id));
      }
    }

    // Update patient status back to Active / Discharged
    if (admission.patientId) {
      await db
        .update(patients)
        .set({ status: "Active", updatedAt: new Date() })
        .where(eq(patients.id, admission.patientId));
    }

    res.status(200).json({
      success: true,
      message: `Patient successfully discharged from admission ${admission.admissionNo}`,
      data: updatedAdmission,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update admission details (diagnosis, notes, extra charges)
 * @route PUT /api/v1/admissions/:id
 * @access Private
 */
export const updateAdmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const [existing] = await db
      .select()
      .from(admissions)
      .where(or(eq(admissions.id, id), eq(admissions.admissionNo, id)))
      .limit(1);

    if (!existing) {
      throw ApiError.notFound(`Admission record "${id}" not found`);
    }

    const updateData = {
      ...(body.diagnosis !== undefined && { diagnosis: body.diagnosis }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.doctorName && { doctorName: body.doctorName }),
      ...(body.doctorId && { doctorId: body.doctorId }),
      ...(body.bedNumber && { bedNumber: body.bedNumber }),
      ...(body.extraCharges !== undefined && { extraCharges: body.extraCharges }),
      ...(body.discountAmount !== undefined && { discountAmount: String(body.discountAmount) }),
      ...(body.advancePayment !== undefined && { advancePayment: String(body.advancePayment) }),
      ...(body.dueAmount !== undefined && { dueAmount: String(body.dueAmount) }),
      ...(body.paymentStatus && { paymentStatus: body.paymentStatus }),
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(admissions)
      .set(updateData)
      .where(eq(admissions.id, existing.id))
      .returning();

    res.status(200).json({
      success: true,
      message: "Admission updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
