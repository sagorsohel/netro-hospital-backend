import { db } from "../db/index.js";
import { staff, dutyRosters, payrolls, leaveRequests } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { generateId, today } from "../utils/generateId.js";

// ==========================================
// 1. STAFF DIRECTORY / PROFILES
// ==========================================

export const getStaff = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 12);
    const search = getQueryString(req.query, "search");
    const department = getQueryString(req.query, "department");
    const designation = getQueryString(req.query, "designation");
    const status = getQueryString(req.query, "status");

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(staff.name, `%${search}%`),
          ilike(staff.designation, `%${search}%`),
          ilike(staff.department, `%${search}%`),
          ilike(staff.phone, `%${search}%`),
          ilike(staff.email, `%${search}%`)
        )
      );
    }

    if (department && department !== "all") {
      conditions.push(ilike(staff.department, department));
    }

    if (designation && designation !== "all") {
      conditions.push(ilike(staff.designation, designation));
    }

    if (status && status !== "all") {
      conditions.push(eq(staff.status, status));
    }

    const whereClause = combineConditions(conditions);

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(staff)
      .where(whereClause);

    const list = await db
      .select()
      .from(staff)
      .where(whereClause)
      .orderBy(desc(staff.createdAt))
      .limit(limit)
      .offset(offset);

    return res.status(200).json({
      success: true,
      data: list,
      pagination: buildPaginationMeta(countResult?.count, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

export const getStaffById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [person] = await db.select().from(staff).where(eq(staff.id, id));

    if (!person) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: person,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated & trimmed by createStaffSchema
export const createStaff = async (req, res, next) => {
  try {
    const { salary, documents, joiningDate, status, ...profile } = req.body;

    const [newStaff] = await db
      .insert(staff)
      .values({
        ...profile,
        id: generateId("staff"),
        joiningDate: joiningDate || today(),
        salary: salary !== undefined ? String(salary) : "25000.00",
        documents: documents || [],
        status: status || "Active",
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Staff profile registered successfully.",
      data: newStaff,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated by updateStaffSchema (unknown fields are stripped)
export const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(staff).where(eq(staff.id, id));

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found.",
      });
    }

    const updateData = {
      ...req.body,
      updatedAt: new Date(),
    };

    if (updateData.salary !== undefined) {
      updateData.salary = String(updateData.salary);
    }

    const [updated] = await db
      .update(staff)
      .set(updateData)
      .where(eq(staff.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Staff profile updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(staff).where(eq(staff.id, id)).returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Staff profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Staff profile deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. HR STATS & ANALYTICS
// ==========================================

export const getStaffStats = async (req, res, next) => {
  try {
    const [staffSummary] = await db
      .select({
        totalStaff: sql`count(*)`,
        totalSalary: sql`COALESCE(SUM(salary), 0)`,
      })
      .from(staff);

    const [dutyToday] = await db
      .select({ count: sql`count(*)` })
      .from(dutyRosters)
      .where(eq(dutyRosters.date, today()));

    const [pendingLeaves] = await db
      .select({ count: sql`count(*)` })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, "Pending"));

    return res.status(200).json({
      success: true,
      stats: {
        totalStaff: parseInt(staffSummary?.totalStaff || "0", 10),
        monthlyPayrollTotal: parseFloat(staffSummary?.totalSalary || "0"),
        onDutyToday: parseInt(dutyToday?.count || "0", 10),
        pendingLeaves: parseInt(pendingLeaves?.count || "0", 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. DUTY ROSTERS & SHIFT PLANNING
// ==========================================

export const getDutyRosters = async (req, res, next) => {
  try {
    const date = getQueryString(req.query, "date");
    const shift = getQueryString(req.query, "shift");
    const department = getQueryString(req.query, "department");
    const search = getQueryString(req.query, "search");

    const conditions = [];

    if (date) {
      conditions.push(eq(dutyRosters.date, date));
    }
    if (shift && shift !== "all") {
      conditions.push(ilike(dutyRosters.shift, `%${shift}%`));
    }
    if (department && department !== "all") {
      conditions.push(ilike(dutyRosters.department, `%${department}%`));
    }
    if (search) {
      conditions.push(
        or(
          ilike(dutyRosters.staffName, `%${search}%`),
          ilike(dutyRosters.wardOrRoom, `%${search}%`),
          ilike(dutyRosters.notes, `%${search}%`)
        )
      );
    }

    const rosters = await db
      .select()
      .from(dutyRosters)
      .where(combineConditions(conditions))
      .orderBy(desc(dutyRosters.date), dutyRosters.shift);

    return res.status(200).json({
      success: true,
      data: rosters,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated & trimmed by createDutyRosterSchema
export const createDutyRoster = async (req, res, next) => {
  try {
    const { staffId, status, ...roster } = req.body;

    const [newRoster] = await db
      .insert(dutyRosters)
      .values({
        ...roster,
        id: generateId("roster"),
        staffId: staffId || "manual",
        status: status || "Scheduled",
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Duty roster shift assigned successfully.",
      data: newRoster,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated by updateDutyRosterSchema (unknown fields are stripped)
export const updateDutyRoster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [updated] = await db
      .update(dutyRosters)
      .set(req.body)
      .where(eq(dutyRosters.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Duty roster schedule not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Duty roster updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDutyRoster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(dutyRosters).where(eq(dutyRosters.id, id)).returning();

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Duty roster not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Duty roster deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 4. PAYROLL & SALARY DISBURSEMENT
// ==========================================

export const getPayrolls = async (req, res, next) => {
  try {
    const month = getQueryString(req.query, "month");
    const status = getQueryString(req.query, "status");

    const conditions = [];
    if (month && month !== "all") {
      conditions.push(eq(payrolls.month, month));
    }
    if (status && status !== "all") {
      conditions.push(eq(payrolls.paymentStatus, status));
    }

    const records = await db
      .select()
      .from(payrolls)
      .where(combineConditions(conditions))
      .orderBy(desc(payrolls.createdAt));

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated & coerced by createPayrollSchema
export const createPayroll = async (req, res, next) => {
  try {
    const {
      staffId,
      staffName,
      month,
      basicSalary,
      bonus = 0,
      deduction = 0,
      paymentStatus,
      paymentDate,
      paymentMethod,
      remarks,
    } = req.body;

    const net = basicSalary + bonus - deduction;

    const [newPay] = await db
      .insert(payrolls)
      .values({
        id: generateId("pay"),
        staffId: staffId || "staff_manual",
        staffName,
        month,
        basicSalary: String(basicSalary),
        bonus: String(bonus),
        deduction: String(deduction),
        netSalary: String(net),
        paymentStatus: paymentStatus || "Paid",
        paymentDate: paymentDate || today(),
        paymentMethod: paymentMethod || "Bank Transfer",
        remarks,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Payroll disbursement recorded successfully.",
      data: newPay,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 5. LEAVE MANAGEMENT
// ==========================================

export const getLeaveRequests = async (req, res, next) => {
  try {
    const status = getQueryString(req.query, "status");
    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(leaveRequests.status, status));
    }

    const requests = await db
      .select()
      .from(leaveRequests)
      .where(combineConditions(conditions))
      .orderBy(desc(leaveRequests.createdAt));

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated & trimmed by createLeaveRequestSchema
export const createLeaveRequest = async (req, res, next) => {
  try {
    const { staffId, totalDays, ...leave } = req.body;

    const [newLeave] = await db
      .insert(leaveRequests)
      .values({
        ...leave,
        id: generateId("leave"),
        staffId: staffId || "manual",
        totalDays: totalDays || 1,
        status: "Pending",
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Leave request submitted successfully.",
      data: newLeave,
    });
  } catch (error) {
    next(error);
  }
};

// Body is validated by updateLeaveStatusSchema
export const updateLeaveStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, approvedBy } = req.body;

    const [updated] = await db
      .update(leaveRequests)
      .set({
        status,
        approvedBy: approvedBy || req.user?.name || "Hospital Admin",
      })
      .where(eq(leaveRequests.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Leave request status updated to ${status}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
