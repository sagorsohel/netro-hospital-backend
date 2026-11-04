import { db } from "../db/index.js";
import { diagnosticInvoices, diagnosticOrders, patients, doctors } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Generate unique Lab Invoice Number e.g. LAB-2026-0004
 */
async function generateUniqueLabInvoiceNo() {
  const currentYear = new Date().getFullYear();
  const [countRes] = await db.select({ count: sql`count(*)` }).from(diagnosticInvoices);
  const nextNum = Number(countRes?.count || 0) + 1;
  const candidate = `LAB-${currentYear}-${String(nextNum).padStart(4, "0")}`;

  const [existing] = await db
    .select({ id: diagnosticInvoices.id })
    .from(diagnosticInvoices)
    .where(eq(diagnosticInvoices.invoiceNo, candidate))
    .limit(1);

  if (!existing) return candidate;
  return `LAB-${currentYear}-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Generate unique Patient ID e.g. PAT-2026-0007
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
 * @desc Create new Diagnostic Order & POS Invoice (auto-create patient if new, multi-test support, discount & due calculation)
 * @route POST /api/v1/diagnostic-invoices
 * @access Private
 */
export const createDiagnosticInvoice = async (req, res, next) => {
  try {
    const body = req.body;
    let patientRecord = null;

    // 1. Patient Intake (Existing vs New Patient Auto-Registration)
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
        status: "Active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const [createdPatient] = await db
        .insert(patients)
        .values(newPatientData)
        .returning();
      patientRecord = createdPatient;
    } else {
      // Lookup existing patient
      const [existingPatient] = await db
        .select()
        .from(patients)
        .where(or(eq(patients.id, body.patientId), eq(patients.patientId, body.patientId)))
        .limit(1);

      if (!existingPatient) {
        throw ApiError.notFound(`Patient "${body.patientId}" not found`);
      }
      patientRecord = existingPatient;
    }

    // 2. Doctor Lookup (if provided)
    let doctorName = body.doctorName || "Dr. Medical Officer";
    let doctorId = body.doctorId || null;
    if (doctorId && !body.doctorName) {
      const [doc] = await db.select().from(doctors).where(eq(doctors.id, doctorId)).limit(1);
      if (doc) doctorName = doc.name;
    }

    // 3. Process Test Items & Financial Calculations
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      throw ApiError.badRequest("At least one diagnostic test must be added to the invoice.");
    }

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
    const discountAmount = parseFloat(body.discountAmount ?? 0);
    const grandTotal = Math.max(0, subtotal - discountAmount);
    const paidAmount = parseFloat(body.paidAmount ?? grandTotal);
    const dueAmount = Math.max(0, grandTotal - paidAmount);

    const paymentStatus =
      dueAmount <= 0
        ? "Paid"
        : paidAmount > 0
        ? "Partial"
        : "Due";

    // 4. Generate unique Invoice Number
    const invoiceNo = await generateUniqueLabInvoiceNo();
    const invoiceId = generateId("lab_inv");

    const newInvoice = {
      id: invoiceId,
      invoiceNo,
      patientId: patientRecord.id,
      patientUniqueId: patientRecord.patientId,
      patientName: patientRecord.name,
      patientPhone: patientRecord.phone,
      patientAge: patientRecord.age,
      patientGender: patientRecord.gender,
      doctorId,
      doctorName,
      items,
      testsCount: items.length,
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      dueAmount: dueAmount.toFixed(2),
      paymentMethod: body.paymentMethod || "Cash",
      paymentStatus,
      sampleStatus: body.sampleStatus || "Collected",
      deliveryDate: body.deliveryDate || "Tomorrow 4:00 PM",
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [createdInvoice] = await db
      .insert(diagnosticInvoices)
      .values(newInvoice)
      .returning();

    // 5. Also insert each individual test item into diagnosticOrders table
    for (let i = 0; i < items.length; i++) {
      const t = items[i];
      const orderNo = items.length === 1 ? invoiceNo : `${invoiceNo}-${i + 1}`;
      const itemFinal = parseFloat(t.finalAmount ?? t.price ?? 0);
      const itemDiscount = parseFloat(t.discountAmount ?? 0);

      await db.insert(diagnosticOrders).values({
        id: generateId("diag_ord"),
        orderNo,
        patientId: patientRecord.id,
        patientUniqueId: patientRecord.patientId,
        patientName: patientRecord.name,
        patientPhone: patientRecord.phone,
        testId: t.testId || null,
        testName: t.testName || "Laboratory Test",
        category: t.category || "Pathology",
        price: parseFloat(t.price || 0).toFixed(2),
        discountAmount: itemDiscount.toFixed(2),
        finalAmount: itemFinal.toFixed(2),
        sampleStatus: body.sampleStatus || "Collected",
        deliveryDate: t.deliveryDate || body.deliveryDate || "Tomorrow 4:00 PM",
        reportUrl: null,
        doctorName,
        createdAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: `Diagnostic invoice ${invoiceNo} generated successfully. Patient ID: ${patientRecord.patientId}`,
      data: {
        invoice: createdInvoice,
        patient: patientRecord,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get all diagnostic invoices with filtering & pagination
 * @route GET /api/v1/diagnostic-invoices
 * @access Private
 */
export const getDiagnosticInvoices = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 10);
    const search = getQueryString(req.query, "search");
    const paymentStatus = getQueryString(req.query, "paymentStatus");
    const sampleStatus = getQueryString(req.query, "sampleStatus");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(diagnosticInvoices.invoiceNo, `%${search}%`),
          ilike(diagnosticInvoices.patientName, `%${search}%`),
          ilike(diagnosticInvoices.patientPhone, `%${search}%`),
          ilike(diagnosticInvoices.patientUniqueId, `%${search}%`),
          ilike(diagnosticInvoices.doctorName, `%${search}%`)
        )
      );
    }

    if (paymentStatus && paymentStatus !== "all") {
      conditions.push(eq(diagnosticInvoices.paymentStatus, paymentStatus));
    }

    if (sampleStatus && sampleStatus !== "all") {
      conditions.push(eq(diagnosticInvoices.sampleStatus, sampleStatus));
    }

    const whereClause = combineConditions(conditions);

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(diagnosticInvoices)
      .where(whereClause);

    const list = await db
      .select()
      .from(diagnosticInvoices)
      .where(whereClause)
      .orderBy(desc(diagnosticInvoices.createdAt))
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
 * @desc Get single diagnostic invoice by ID or invoiceNo
 * @route GET /api/v1/diagnostic-invoices/:id
 * @access Private
 */
export const getDiagnosticInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [invoice] = await db
      .select()
      .from(diagnosticInvoices)
      .where(or(eq(diagnosticInvoices.id, id), eq(diagnosticInvoices.invoiceNo, id)))
      .limit(1);

    if (!invoice) {
      throw ApiError.notFound(`Diagnostic invoice "${id}" not found`);
    }

    // Lookup patient details
    let patientProfile = null;
    if (invoice.patientId) {
      const [p] = await db.select().from(patients).where(eq(patients.id, invoice.patientId)).limit(1);
      patientProfile = p || null;
    }

    res.status(200).json({
      success: true,
      data: {
        ...invoice,
        patientProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Settle remaining due on a diagnostic invoice
 * @route PATCH /api/v1/diagnostic-invoices/:id/due
 * @access Private
 */
export const settleDiagnosticDue = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { additionalPayment, paymentMethod } = req.body;

    const [existing] = await db
      .select()
      .from(diagnosticInvoices)
      .where(or(eq(diagnosticInvoices.id, id), eq(diagnosticInvoices.invoiceNo, id)))
      .limit(1);

    if (!existing) {
      throw ApiError.notFound(`Diagnostic invoice "${id}" not found`);
    }

    const currentPaid = parseFloat(existing.paidAmount || 0);
    const grandTotal = parseFloat(existing.grandTotal || 0);
    const payingNow = parseFloat(additionalPayment || 0);
    const newPaid = Math.min(grandTotal, currentPaid + payingNow);
    const newDue = Math.max(0, grandTotal - newPaid);

    const newPaymentStatus = newDue <= 0 ? "Paid" : "Partial";

    const [updated] = await db
      .update(diagnosticInvoices)
      .set({
        paidAmount: newPaid.toFixed(2),
        dueAmount: newDue.toFixed(2),
        paymentStatus: newPaymentStatus,
        ...(paymentMethod && { paymentMethod }),
        updatedAt: new Date(),
      })
      .where(eq(diagnosticInvoices.id, existing.id))
      .returning();

    res.status(200).json({
      success: true,
      message: `Due payment recorded. Remaining due: ৳${newDue.toFixed(2)}`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
