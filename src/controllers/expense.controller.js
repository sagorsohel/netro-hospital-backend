import { db } from "../db/index.js";
import { expenses } from "../db/schema.js";
import { eq, ilike, or, and, desc, sql, gte, lte } from "drizzle-orm";

/**
 * @desc Get all expenses with pagination, search, category & date filters
 * @route GET /api/expenses
 * @access Authenticated
 */
export const getExpenses = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : "";
    const category = req.query.category ? req.query.category.trim() : "";
    const status = req.query.status ? req.query.status.trim() : "";
    const startDate = req.query.startDate ? req.query.startDate.trim() : "";
    const endDate = req.query.endDate ? req.query.endDate.trim() : "";

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

    const whereClause =
      conditions.length === 1
        ? conditions[0]
        : conditions.length > 1
        ? and(...conditions)
        : undefined;

    // Total count and total amount of filtered query
    const [summaryResult] = await db
      .select({
        count: sql`count(*)`,
        totalAmount: sql`COALESCE(SUM(amount), 0)`,
      })
      .from(expenses)
      .where(whereClause);

    const total = parseInt(summaryResult?.count || "0", 10);
    const totalAmount = parseFloat(summaryResult?.totalAmount || "0");
    const totalPages = Math.ceil(total / limit) || 1;

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
        total,
        page,
        limit,
        totalPages,
        totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get expense summary statistics (breakdown by category, monthly total)
 * @route GET /api/expenses/stats
 * @access Authenticated
 */
export const getExpenseStats = async (req, res, next) => {
  try {
    // Current date helpers
    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7); // e.g. "2026-10"
    const todayStr = now.toISOString().slice(0, 10); // e.g. "2026-10-29"

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
 * @route GET /api/expenses/:id
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
 * @desc Create new expense entry
 * @route POST /api/expenses
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

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense title is required.",
      });
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid positive expense amount.",
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "Expense category is required.",
      });
    }

    const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const generatedVoucher =
      voucherNo && voucherNo.trim()
        ? voucherNo.trim()
        : `VCH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
            1000 + Math.random() * 9000
          )}`;

    const newExpense = {
      id: expenseId,
      title: title.trim(),
      description: description?.trim() || "",
      date: date?.trim() || new Date().toISOString().slice(0, 10),
      amount: String(amount),
      purpose: purpose?.trim() || "",
      category: category.trim(),
      billCopy: billCopy?.trim() || null,
      voucherNo: generatedVoucher,
      paymentMethod: paymentMethod?.trim() || "Cash",
      paidTo: paidTo?.trim() || "",
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
 * @desc Update expense entry
 * @route PUT /api/expenses/:id
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

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (date !== undefined) updateData.date = date.trim();
    if (amount !== undefined) updateData.amount = String(amount);
    if (purpose !== undefined) updateData.purpose = purpose.trim();
    if (category !== undefined) updateData.category = category.trim();
    if (billCopy !== undefined) updateData.billCopy = billCopy ? billCopy.trim() : null;
    if (voucherNo !== undefined) updateData.voucherNo = voucherNo.trim();
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod.trim();
    if (paidTo !== undefined) updateData.paidTo = paidTo.trim();
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
 * @route DELETE /api/expenses/:id
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
