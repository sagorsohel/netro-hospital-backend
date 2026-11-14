import { db } from "../db/index.js";
import { pharmacyInvoices, medicines } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions } from "../utils/query.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * @desc Get pharmacy POS invoices with search & pagination
 * @route GET /api/v1/pharmacy-invoices
 */
export const getPharmacyInvoices = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 12);
    const { search, status } = req.query;

    const conditions = [];

    if (search) {
      const term = `%${search}%`;
      conditions.push(
        or(
          ilike(pharmacyInvoices.invoiceNo, term),
          ilike(pharmacyInvoices.customerName, term),
          ilike(pharmacyInvoices.phone, term)
        )
      );
    }

    if (status && status !== "all") {
      conditions.push(eq(pharmacyInvoices.status, status));
    }

    const where = combineConditions(conditions);

    const [list, [{ total }]] = await Promise.all([
      db
        .select()
        .from(pharmacyInvoices)
        .where(where)
        .orderBy(desc(pharmacyInvoices.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: sql`count(*)`.mapWith(Number) }).from(pharmacyInvoices).where(where),
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
 * @desc Get single invoice by id
 * @route GET /api/v1/pharmacy-invoices/:id
 */
export const getPharmacyInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [invoice] = await db
      .select()
      .from(pharmacyInvoices)
      .where(or(eq(pharmacyInvoices.id, id), eq(pharmacyInvoices.invoiceNo, id)));

    if (!invoice) throw ApiError.notFound("Invoice not found.");
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create pharmacy POS invoice and auto-decrement stock
 * @route POST /api/v1/pharmacy-invoices
 */
export const createPharmacyInvoice = async (req, res, next) => {
  try {
    const {
      customerName,
      phone,
      memberId,
      isMember = false,
      hasPrescription = false,
      subtotal,
      discountAmount = "0",
      discountPercentage = "0",
      grandTotal,
      status = "Paid",
      whatsappSent = false,
      smsSent = false,
      items = [],
    } = req.body;

    const invoiceNo = `PHARM-${Date.now().toString().slice(-6)}`;

    // Transaction to insert invoice and adjust medicine stocks
    const result = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(pharmacyInvoices)
        .values({
          id: generateId("inv"),
          invoiceNo,
          customerName: customerName || "Walk-in Customer",
          phone: phone || "01700000000",
          memberId: memberId || null,
          isMember: Boolean(isMember),
          hasPrescription: Boolean(hasPrescription),
          subtotal: String(subtotal),
          discountAmount: String(discountAmount),
          discountPercentage: String(discountPercentage),
          grandTotal: String(grandTotal),
          status,
          whatsappSent: Boolean(whatsappSent),
          smsSent: Boolean(smsSent),
          items,
        })
        .returning();

      // Decrement stock for sold medicines
      for (const item of items) {
        if (item.medicineId && item.quantity) {
          const qtyInPieces = Number(item.quantity);
          await tx
            .update(medicines)
            .set({
              totalPieces: sql`GREATEST(0, ${medicines.totalPieces} - ${qtyInPieces})`,
            })
            .where(eq(medicines.id, item.medicineId));
        }
      }

      return invoice;
    });

    res.status(201).json({
      success: true,
      message: `Invoice #${result.invoiceNo} created successfully.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
