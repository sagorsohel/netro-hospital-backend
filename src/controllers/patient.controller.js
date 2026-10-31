import { db } from "../db/index.js";
import { patients, admissions, diagnosticOrders, appointments } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { ApiError } from "../utils/ApiError.js";

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
 * @desc Get all patients with search, filtering & pagination
 * @route GET /api/v1/patients
 * @access Private
 */
export const getPatients = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 10);
    const search = getQueryString(req.query, "search");
    const gender = getQueryString(req.query, "gender");
    const bloodGroup = getQueryString(req.query, "bloodGroup");
    const status = getQueryString(req.query, "status");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(patients.name, `%${search}%`),
          ilike(patients.patientId, `%${search}%`),
          ilike(patients.phone, `%${search}%`),
          ilike(patients.email, `%${search}%`),
          ilike(patients.guardianName, `%${search}%`),
          ilike(patients.address, `%${search}%`)
        )
      );
    }

    if (gender && gender !== "all") {
      conditions.push(eq(patients.gender, gender));
    }

    if (bloodGroup && bloodGroup !== "all") {
      conditions.push(eq(patients.bloodGroup, bloodGroup));
    }

    if (status && status !== "all") {
      conditions.push(eq(patients.status, status));
    }

    const whereClause = combineConditions(conditions);

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(patients)
      .where(whereClause);

    const list = await db
      .select()
      .from(patients)
      .where(whereClause)
      .orderBy(desc(patients.createdAt))
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
 * @desc Get single patient by ID with full visit history (Admissions, Diagnostics, Appointments, Billing)
 * @route GET /api/v1/patients/:id
 * @access Private
 */
export const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Search by internal UUID id OR public patientId
    const [patient] = await db
      .select()
      .from(patients)
      .where(or(eq(patients.id, id), eq(patients.patientId, id)))
      .limit(1);

    if (!patient) {
      throw ApiError.notFound(`Patient with ID "${id}" not found`);
    }

    // 1. Fetch Inpatient Admissions History
    const patientAdmissions = await db
      .select()
      .from(admissions)
      .where(
        or(
          eq(admissions.patientId, patient.id),
          eq(admissions.patientUniqueId, patient.patientId || "")
        )
      )
      .orderBy(desc(admissions.admissionDate));

    // 2. Fetch Laboratory & Diagnostic Orders History
    const patientDiagnostics = await db
      .select()
      .from(diagnosticOrders)
      .where(
        or(
          eq(diagnosticOrders.patientId, patient.id),
          eq(diagnosticOrders.patientUniqueId, patient.patientId || "")
        )
      )
      .orderBy(desc(diagnosticOrders.createdAt));

    // 3. Fetch Doctor Appointments History
    const patientAppointments = await db
      .select()
      .from(appointments)
      .where(
        or(
          eq(appointments.patientId, patient.id),
          ilike(appointments.patientName, patient.name)
        )
      )
      .orderBy(desc(appointments.createdAt));

    // 4. Calculate Financial & Visit Metrics
    const totalAdmissionBill = patientAdmissions.reduce(
      (sum, a) => sum + parseFloat(a.grandTotal || 0),
      0
    );
    const totalAdvancePaid = patientAdmissions.reduce(
      (sum, a) => sum + parseFloat(a.advancePayment || 0),
      0
    );
    const totalDue = patientAdmissions.reduce(
      (sum, a) => sum + parseFloat(a.dueAmount || 0),
      0
    );
    const totalDiagnosticBill = patientDiagnostics.reduce(
      (sum, d) => sum + parseFloat(d.finalAmount || 0),
      0
    );

    const fullHistory = {
      ...patient,
      admissions: patientAdmissions,
      diagnostics: patientDiagnostics,
      appointments: patientAppointments,
      metrics: {
        totalAdmissions: patientAdmissions.length,
        totalDiagnostics: patientDiagnostics.length,
        totalAppointments: patientAppointments.length,
        totalVisits:
          patientAdmissions.length +
          patientDiagnostics.length +
          patientAppointments.length,
        totalBilled: (totalAdmissionBill + totalDiagnosticBill).toFixed(2),
        totalPaid: totalAdvancePaid.toFixed(2),
        totalDue: totalDue.toFixed(2),
      },
    };

    res.status(200).json({
      success: true,
      data: fullHistory,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create new patient with auto-generated unique Patient ID
 * @route POST /api/v1/patients
 * @access Private
 */
export const createPatient = async (req, res, next) => {
  try {
    const payload = req.body;

    const patientId = await generateUniquePatientId();
    const id = generateId("pat");

    const newPatient = {
      id,
      patientId,
      name: payload.name.trim(),
      age: payload.age ? Number(payload.age) : null,
      dob: payload.dob || null,
      gender: payload.gender || "Other",
      phone: payload.phone.trim(),
      email: payload.email ? payload.email.trim() : null,
      bloodGroup: payload.bloodGroup || null,
      address: payload.address || null,
      guardianName: payload.guardianName || null,
      guardianPhone: payload.guardianPhone || null,
      guardianRelation: payload.guardianRelation || null,
      emergencyContact: payload.emergencyContact || null,
      maritalStatus: payload.maritalStatus || "Single",
      occupation: payload.occupation || null,
      allergies: payload.allergies || null,
      status: payload.status || "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(patients).values(newPatient).returning();

    res.status(201).json({
      success: true,
      message: `Patient profile created successfully with ID ${patientId}`,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update patient profile
 * @route PUT /api/v1/patients/:id
 * @access Private
 */
export const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const [existing] = await db
      .select()
      .from(patients)
      .where(or(eq(patients.id, id), eq(patients.patientId, id)))
      .limit(1);

    if (!existing) {
      throw ApiError.notFound(`Patient with ID "${id}" not found`);
    }

    const updatedData = {
      ...(payload.name && { name: payload.name.trim() }),
      ...(payload.age !== undefined && { age: payload.age ? Number(payload.age) : null }),
      ...(payload.dob !== undefined && { dob: payload.dob }),
      ...(payload.gender !== undefined && { gender: payload.gender }),
      ...(payload.phone && { phone: payload.phone.trim() }),
      ...(payload.email !== undefined && { email: payload.email }),
      ...(payload.bloodGroup !== undefined && { bloodGroup: payload.bloodGroup }),
      ...(payload.address !== undefined && { address: payload.address }),
      ...(payload.guardianName !== undefined && { guardianName: payload.guardianName }),
      ...(payload.guardianPhone !== undefined && { guardianPhone: payload.guardianPhone }),
      ...(payload.guardianRelation !== undefined && { guardianRelation: payload.guardianRelation }),
      ...(payload.emergencyContact !== undefined && { emergencyContact: payload.emergencyContact }),
      ...(payload.maritalStatus !== undefined && { maritalStatus: payload.maritalStatus }),
      ...(payload.occupation !== undefined && { occupation: payload.occupation }),
      ...(payload.allergies !== undefined && { allergies: payload.allergies }),
      ...(payload.status !== undefined && { status: payload.status }),
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(patients)
      .set(updatedData)
      .where(eq(patients.id, existing.id))
      .returning();

    res.status(200).json({
      success: true,
      message: "Patient profile updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete patient
 * @route DELETE /api/v1/patients/:id
 * @access Private (Admin)
 */
export const deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(patients)
      .where(or(eq(patients.id, id), eq(patients.patientId, id)))
      .limit(1);

    if (!existing) {
      throw ApiError.notFound(`Patient with ID "${id}" not found`);
    }

    await db.delete(patients).where(eq(patients.id, existing.id));

    res.status(200).json({
      success: true,
      message: "Patient deleted successfully",
      data: { id: existing.id, patientId: existing.patientId },
    });
  } catch (error) {
    next(error);
  }
};
