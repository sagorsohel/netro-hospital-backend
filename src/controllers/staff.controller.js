import { db } from "../db/index.js";
import { staff, dutyRosters, payrolls, leaveRequests } from "../db/schema.js";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";

// ==========================================
// 1. STAFF DIRECTORY / PROFILES
// ==========================================

export const getStaff = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 12));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : "";
    const department = req.query.department ? req.query.department.trim() : "";
    const designation = req.query.designation ? req.query.designation.trim() : "";
    const status = req.query.status ? req.query.status.trim() : "";

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

    const whereClause =
      conditions.length === 1
        ? conditions[0]
        : conditions.length > 1
        ? and(...conditions)
        : undefined;

    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(staff)
      .where(whereClause);

    const total = parseInt(countResult?.count || "0", 10);
    const totalPages = Math.ceil(total / limit) || 1;

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
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
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

export const createStaff = async (req, res, next) => {
  try {
    const {
      name,
      designation,
      departmentId,
      department,
      phone,
      email,
      address,
      photo,
      joiningDate,
      salary,
      bloodGroup,
      emergencyContact,
      qualification,
      status,
    } = req.body;

    if (!name || !designation || !department || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, designation, department, and phone are required.",
      });
    }

    const id = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const [newStaff] = await db
      .insert(staff)
      .values({
        id,
        name: name.trim(),
        designation: designation.trim(),
        departmentId: departmentId || undefined,
        department: department.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : undefined,
        address: address ? address.trim() : undefined,
        photo: photo ? photo.trim() : undefined,
        joiningDate: joiningDate || new Date().toISOString().slice(0, 10),
        salary: salary ? String(salary) : "25000.00",
        bloodGroup: bloodGroup || undefined,
        emergencyContact: emergencyContact || undefined,
        qualification: qualification ? qualification.trim() : undefined,
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

    if (updateData.salary) {
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
    const today = new Date().toISOString().slice(0, 10);

    const [staffSummary] = await db
      .select({
        totalStaff: sql`count(*)`,
        totalSalary: sql`COALESCE(SUM(salary), 0)`,
      })
      .from(staff);

    const [dutyToday] = await db
      .select({ count: sql`count(*)` })
      .from(dutyRosters)
      .where(eq(dutyRosters.date, today));

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
    const date = req.query.date ? req.query.date.trim() : "";
    const shift = req.query.shift ? req.query.shift.trim() : "";
    const department = req.query.department ? req.query.department.trim() : "";
    const search = req.query.search ? req.query.search.trim() : "";

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

    const whereClause =
      conditions.length === 1
        ? conditions[0]
        : conditions.length > 1
        ? and(...conditions)
        : undefined;

    const rosters = await db
      .select()
      .from(dutyRosters)
      .where(whereClause)
      .orderBy(desc(dutyRosters.date), dutyRosters.shift);

    return res.status(200).json({
      success: true,
      data: rosters,
    });
  } catch (error) {
    next(error);
  }
};

export const createDutyRoster = async (req, res, next) => {
  try {
    const { staffId, staffName, staffRole, department, shift, date, wardOrRoom, status, notes } =
      req.body;

    if (!staffName || !department || !shift || !date) {
      return res.status(400).json({
        success: false,
        message: "Staff name, department, shift, and date are required.",
      });
    }

    const id = `roster_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const [newRoster] = await db
      .insert(dutyRosters)
      .values({
        id,
        staffId: staffId || "manual",
        staffName: staffName.trim(),
        staffRole: staffRole ? staffRole.trim() : undefined,
        department: department.trim(),
        shift: shift.trim(),
        date: date.trim(),
        wardOrRoom: wardOrRoom ? wardOrRoom.trim() : undefined,
        status: status || "Scheduled",
        notes: notes ? notes.trim() : undefined,
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
    const month = req.query.month ? req.query.month.trim() : "";
    const status = req.query.status ? req.query.status.trim() : "";

    const conditions = [];
    if (month && month !== "all") {
      conditions.push(eq(payrolls.month, month));
    }
    if (status && status !== "all") {
      conditions.push(eq(payrolls.paymentStatus, status));
    }

    const whereClause =
      conditions.length === 1
        ? conditions[0]
        : conditions.length > 1
        ? and(...conditions)
        : undefined;

    const records = await db
      .select()
      .from(payrolls)
      .where(whereClause)
      .orderBy(desc(payrolls.createdAt));

    return res.status(200).json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

export const createPayroll = async (req, res, next) => {
  try {
    const {
      staffId,
      staffName,
      month,
      basicSalary,
      bonus,
      deduction,
      paymentStatus,
      paymentDate,
      paymentMethod,
      remarks,
    } = req.body;

    if (!staffName || !month || !basicSalary) {
      return res.status(400).json({
        success: false,
        message: "Staff name, month, and basic salary are required.",
      });
    }

    const basic = parseFloat(basicSalary) || 0;
    const bon = parseFloat(bonus) || 0;
    const ded = parseFloat(deduction) || 0;
    const net = basic + bon - ded;

    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const [newPay] = await db
      .insert(payrolls)
      .values({
        id,
        staffId: staffId || "staff_manual",
        staffName: staffName.trim(),
        month: month.trim(),
        basicSalary: String(basic),
        bonus: String(bon),
        deduction: String(ded),
        netSalary: String(net),
        paymentStatus: paymentStatus || "Paid",
        paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
        paymentMethod: paymentMethod || "Bank Transfer",
        remarks: remarks ? remarks.trim() : undefined,
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
    const status = req.query.status ? req.query.status.trim() : "";
    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(leaveRequests.status, status));
    }

    const whereClause = conditions.length > 0 ? conditions[0] : undefined;

    const requests = await db
      .select()
      .from(leaveRequests)
      .where(whereClause)
      .orderBy(desc(leaveRequests.createdAt));

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    next(error);
  }
};

export const createLeaveRequest = async (req, res, next) => {
  try {
    const { staffId, staffName, leaveType, startDate, endDate, totalDays, reason } = req.body;

    if (!staffName || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "Staff name, leave type, start date, end date, and reason are required.",
      });
    }

    const id = `leave_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const [newLeave] = await db
      .insert(leaveRequests)
      .values({
        id,
        staffId: staffId || "manual",
        staffName: staffName.trim(),
        leaveType: leaveType.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim(),
        totalDays: parseInt(totalDays) || 1,
        reason: reason.trim(),
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

export const updateLeaveStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, approvedBy } = req.body;

    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved, Rejected, or Pending.",
      });
    }

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
