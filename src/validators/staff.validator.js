import { z } from "zod";
import {
  requiredString,
  optionalString,
  optionalEmail,
  optionalDate,
  requiredDate,
  requiredPositiveNumber,
  optionalNonNegativeNumber,
  optionalPositiveInt,
  jsonArray,
  nonEmptyUpdate,
} from "./common.js";

// ---------- Staff profiles ----------

const staffFields = {
  name: requiredString("Name"),
  designation: requiredString("Designation", 100),
  departmentId: optionalString(64),
  department: requiredString("Department"),
  phone: requiredString("Phone", 50),
  email: optionalEmail(),
  address: optionalString(500),
  photo: optionalString(500),
  joiningDate: optionalDate("Joining date"),
  salary: optionalNonNegativeNumber("Salary"),
  bloodGroup: optionalString(10),
  emergencyContact: optionalString(50),
  qualification: optionalString(),
  documents: jsonArray("Documents"),
  status: optionalString(50),
};

export const createStaffSchema = z.object(staffFields);

export const updateStaffSchema = nonEmptyUpdate(
  z.object({
    ...staffFields,
    name: staffFields.name.optional(),
    designation: staffFields.designation.optional(),
    department: staffFields.department.optional(),
    phone: staffFields.phone.optional(),
  })
);

// ---------- Duty rosters ----------

const rosterFields = {
  staffId: optionalString(64),
  staffName: requiredString("Staff name"),
  staffRole: optionalString(100),
  department: requiredString("Department"),
  shift: requiredString("Shift", 100),
  date: requiredDate("Date"),
  wardOrRoom: optionalString(100),
  status: optionalString(50),
  notes: optionalString(500),
};

export const createDutyRosterSchema = z.object(rosterFields);

export const updateDutyRosterSchema = nonEmptyUpdate(
  z.object({
    ...rosterFields,
    staffName: rosterFields.staffName.optional(),
    department: rosterFields.department.optional(),
    shift: rosterFields.shift.optional(),
    date: rosterFields.date.optional(),
  })
);

// ---------- Payroll ----------

export const createPayrollSchema = z.object({
  staffId: optionalString(64),
  staffName: requiredString("Staff name"),
  month: requiredString("Month", 50),
  basicSalary: requiredPositiveNumber("Basic salary"),
  bonus: optionalNonNegativeNumber("Bonus"),
  deduction: optionalNonNegativeNumber("Deduction"),
  paymentStatus: optionalString(50),
  paymentDate: optionalDate("Payment date"),
  paymentMethod: optionalString(50),
  remarks: optionalString(500),
});

// ---------- Leave requests ----------

export const LEAVE_STATUSES = ["Approved", "Rejected", "Pending"];

export const createLeaveRequestSchema = z
  .object({
    staffId: optionalString(64),
    staffName: requiredString("Staff name"),
    leaveType: requiredString("Leave type", 100),
    startDate: requiredDate("Start date"),
    endDate: requiredDate("End date"),
    totalDays: optionalPositiveInt("Total days"),
    reason: requiredString("Reason", 500),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
  });

export const updateLeaveStatusSchema = z.object({
  status: z.enum(LEAVE_STATUSES, { error: "Status must be Approved, Rejected, or Pending." }),
  approvedBy: optionalString(),
});
