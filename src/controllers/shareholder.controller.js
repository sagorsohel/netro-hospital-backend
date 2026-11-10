import { db } from "../db/index.js";
import {
  shareholders,
  shareholderPayouts,
  diagnosticInvoices,
  admissions,
  expenses,
} from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { generateId } from "../utils/generateId.js";

/**
 * @desc Get all shareholders with calculated profit distribution & ownership breakdown
 * @route GET /api/v1/shareholders
 * @access Authenticated
 */
export const getShareholders = async (req, res, next) => {
  try {
    const list = await db
      .select()
      .from(shareholders)
      .orderBy(desc(shareholders.ownershipPercentage));

    // Calculate Hospital Financial Metrics for Equity Payout Distribution
    const [diagRevenue] = await db
      .select({ total: sql`COALESCE(SUM(paid_amount), 0)` })
      .from(diagnosticInvoices);

    const [admRevenue] = await db
      .select({ total: sql`COALESCE(SUM(advance_payment), 0)` })
      .from(admissions);

    const [expTotal] = await db
      .select({ total: sql`COALESCE(SUM(amount), 0)` })
      .from(expenses);

    const totalIncome = Number(diagRevenue?.total || 0) + Number(admRevenue?.total || 0);
    const totalExpense = Number(expTotal?.total || 0);
    const netProfit = Math.max(0, totalIncome - totalExpense);

    const totalOwnershipAllocated = list.reduce(
      (sum, s) => sum + Number(s.ownershipPercentage || 0),
      0
    );

    // Attach calculated earnings to each shareholder
    const enriched = list.map((s) => {
      const pct = Number(s.ownershipPercentage || 0);
      const calculatedEarning = Number(((netProfit * pct) / 100).toFixed(2));
      return {
        ...s,
        calculatedEarning,
      };
    });

    res.json({
      success: true,
      data: enriched,
      metrics: {
        totalShareholders: list.length,
        totalOwnershipAllocated,
        availableOwnershipPercentage: Math.max(0, 100 - totalOwnershipAllocated),
        hospitalFinancialSummary: {
          totalIncome,
          totalExpense,
          netProfit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single shareholder by ID
 * @route GET /api/v1/shareholders/:id
 * @access Authenticated
 */
export const getShareholderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [shareholder] = await db
      .select()
      .from(shareholders)
      .where(eq(shareholders.id, id));

    if (!shareholder) {
      return res.status(404).json({ success: false, message: "Shareholder not found" });
    }

    const payouts = await db
      .select()
      .from(shareholderPayouts)
      .where(eq(shareholderPayouts.shareholderId, id))
      .orderBy(desc(shareholderPayouts.paymentDate));

    res.json({
      success: true,
      data: {
        ...shareholder,
        payouts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create new shareholder
 * @route POST /api/v1/shareholders
 * @access Authenticated (Admin)
 */
export const createShareholder = async (req, res, next) => {
  try {
    const payload = req.body;
    const id = generateId("sh");

    const [created] = await db
      .insert(shareholders)
      .values({
        id,
        name: payload.name,
        phone: payload.phone,
        email: payload.email || null,
        nid: payload.nid || null,
        ownershipPercentage: String(payload.ownershipPercentage || 0),
        investmentAmount: String(payload.investmentAmount || 0),
        joinedDate: payload.joinedDate || new Date().toISOString().slice(0, 10),
        bankAccountDetails: payload.bankAccountDetails || null,
        status: payload.status || "Active",
        notes: payload.notes || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Shareholder registered successfully",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update shareholder
 * @route PUT /api/v1/shareholders/:id
 * @access Authenticated (Admin)
 */
export const updateShareholder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const [updated] = await db
      .update(shareholders)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(shareholders.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, message: "Shareholder not found" });
    }

    res.json({
      success: true,
      message: "Shareholder updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete shareholder
 * @route DELETE /api/v1/shareholders/:id
 * @access Authenticated (Admin)
 */
export const deleteShareholder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [deleted] = await db
      .delete(shareholders)
      .where(eq(shareholders.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Shareholder not found" });
    }

    res.json({
      success: true,
      message: "Shareholder deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Record a dividend / profit payout
 * @route POST /api/v1/shareholders/:id/payouts
 * @access Authenticated (Admin)
 */
export const createShareholderPayout = async (req, res, next) => {
  try {
    const payload = req.body;
    const [shareholder] = await db
      .select()
      .from(shareholders)
      .where(eq(shareholders.id, payload.shareholderId));

    if (!shareholder) {
      return res.status(404).json({ success: false, message: "Shareholder not found" });
    }

    const id = generateId("pay");
    const [created] = await db
      .insert(shareholderPayouts)
      .values({
        id,
        shareholderId: shareholder.id,
        shareholderName: shareholder.name,
        amount: String(payload.amount),
        period: payload.period,
        paymentDate: payload.paymentDate || new Date().toISOString().slice(0, 10),
        paymentMethod: payload.paymentMethod || "Bank Transfer",
        transactionRef: payload.transactionRef || null,
        status: payload.status || "Paid",
        notes: payload.notes || null,
      })
      .returning();

    res.status(201).json({
      success: true,
      message: "Dividend payout recorded successfully",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

