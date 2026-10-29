import { db } from "../db/index.js";
import { expenses } from "../db/schema.js";
import { eq, ilike, or, desc, sql, gte, lte } from "drizzle-orm";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { generateId, today } from "../utils/generateId.js";

/**
 * @desc Get all expenses with pagination, search, category & date filters
 * @route GET /api/v1/expenses
 * @access Authenticated
 */
export const getExpenses = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 10);
    const search = getQueryString(req.query, "search");
    const category = getQueryString(req.query, "category");
    const status = getQueryString(req.query, "status");
    const startDate = getQueryString(req.query, "startDate");
    const endDate = getQueryString(req.query, "endDate");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(expenses.title, `%${search}%`),
          ilike(expenses.description, `%${search}%`),
          ilike(expenses.purpose, `%${search}%`),
          ilike(expenses.voucherNo, `%${search}%`),
          ilike(expenses.paidTo, `%${search}%`),
          ilike(expenses.recordedBy, `%${search}%`)
        )
      );
    }

    if (category && category !== "all") {
      conditions.push(eq(expenses.category, category));
    }

    if (status && status !== "all") {
      conditions.push(eq(expenses.status, status));
    }

    if (startDate) {
      conditions.push(gte(expenses.date, startDate));
    }

    if (endDate) {
      conditions.push(lte(expenses.date, endDate));
    }

    const whereClause = combineConditions(conditions);

    // Total count and total amount of filtered query
    const [summaryResult] = await db
      .select({
        count: sql`count(*)`,
        totalAmount: sql`COALESCE(SUM(amount), 0)`,
      })
      .from(expenses)
      .where(whereClause);

    const totalAmount = parseFloat(summaryResult?.totalAmount || "0");

    // Fetch paginated list
    const list = await db
      .select()
      .from(expenses)
      .where(whereClause)
      .orderBy(desc(expenses.date), desc(expenses.createdAt))
      .limit(limit)
      .offset(offset);

    return res.status(200).json({
      success: true,
      data: list,
      pagination: {
        ...buildPaginationMeta(summaryResult?.count, page, limit),
        totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get expense summary statistics (breakdown by category, monthly total)
 * @route GET /api/v1/expenses/stats
 * @access Authenticated
 */
export const getExpenseStats = async (req, res, next) => {
  try {
    // Current date helpers
    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7); // e.g. "2026-10"
    const todayStr = today(); // e.g. "2026-10-29"

    // 1. Overall & Monthly total
    const [overall] = await db
      .select({
        totalOverall: sql`COALESCE(SUM(amount), 0)`,
        countOverall: sql`count(*)`,
      })
      .from(expenses);

    const [monthly] = await db
      .select({
        totalThisMonth: sql`COALESCE(SUM(amount), 0)`,
        countThisMonth: sql`count(*)`,
      })
      .from(expenses)
      .where(ilike(expenses.date, `${currentYearMonth}%`));

    const [daily] = await db
      .select({
        totalToday: sql`COALESCE(SUM(amount), 0)`,
        countToday: sql`count(*)`,
      })
      .from(expenses)
      .where(eq(expenses.date, todayStr));

    // 2. Category breakdown
    const categoryBreakdown = await db
      .select({
        category: expenses.category,
        totalAmount: sql`COALESCE(SUM(amount), 0)`,
        count: sql`count(*)`,
      })
      .from(expenses)
      .groupBy(expenses.category)
      .orderBy(desc(sql`SUM(amount)`));

    return res.status(200).json({
      success: true,
      stats: {
        totalOverall: parseFloat(overall?.totalOverall || "0"),
        countOverall: parseInt(overall?.countOverall || "0", 10),
        totalThisMonth: parseFloat(monthly?.totalThisMonth || "0"),
        countThisMonth: parseInt(monthly?.countThisMonth || "0", 10),
        totalToday: parseFloat(daily?.totalToday || "0"),
        countToday: parseInt(daily?.countToday || "0", 10),
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c.category,
          totalAmount: parseFloat(c.totalAmount || "0"),
          count: parseInt(c.count || "0", 10),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single expense by ID
 * @route GET /api/v1/expenses/:id
 * @access Authenticated
 */
export const getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense record not found with this ID.",
      });
    }

    return res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create new expense entry (body validated by createExpenseSchema)
 * @route POST /api/v1/expenses
 * @access Authenticated
 */
export const createExpense = async (req, res, next) => {
  try {
    const {
      title,
      description,
      date,
      amount,
      purpose,
      category,
      billCopy,
      voucherNo,
      paymentMethod,
      paidTo,
      status,
    } = req.body;

    const generatedVoucher =
      voucherNo ||
      `VCH-${today().replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newExpense = {
      id: generateId("exp", 5),
      title,
      description: description || "",
      date: date || today(),
      amount: String(amount),
      purpose: purpose || "",
      category,
      billCopy: billCopy || null,
      voucherNo: generatedVoucher,
      paymentMethod: paymentMethod || "Cash",
      paidTo: paidTo || "",
      status: status || "Paid",
      recordedBy: req.user?.name || "Admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(expenses).values(newExpense).returning();

    return res.status(201).json({
      success: true,
      message: "Expense record created successfully.",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update expense entry (body validated by updateExpenseSchema)
 * @route PUT /api/v1/expenses/:id
 * @access Authenticated
 */
export const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Expense record not found with this ID.",
      });
    }

    const {
      title,
      description,
      date,
      amount,
      purpose,
      category,
      billCopy,
      voucherNo,
      paymentMethod,
      paidTo,
      status,
    } = req.body;

    const updateData = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = date;
    if (amount !== undefined) updateData.amount = String(amount);
    if (purpose !== undefined) updateData.purpose = purpose;
    if (category !== undefined) updateData.category = category;
    if (billCopy !== undefined) updateData.billCopy = billCopy || null;
    if (voucherNo !== undefined) updateData.voucherNo = voucherNo;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paidTo !== undefined) updateData.paidTo = paidTo;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(expenses)
      .set(updateData)
      .where(eq(expenses.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Expense record updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete expense entry
 * @route DELETE /api/v1/expenses/:id
 * @access Admin only
 */
export const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Expense record not found with this ID.",
      });
    }

    await db.delete(expenses).where(eq(expenses.id, id));

    return res.status(200).json({
      success: true,
      message: `Expense voucher ${existing.voucherNo} deleted successfully.`,
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
};
