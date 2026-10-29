import express from "express";
import {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffStats,
  getDutyRosters,
  createDutyRoster,
  updateDutyRoster,
  deleteDutyRoster,
  getPayrolls,
  createPayroll,
  getLeaveRequests,
  createLeaveRequest,
  updateLeaveStatus,
} from "../controllers/staff.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createStaffSchema,
  updateStaffSchema,
  createDutyRosterSchema,
  updateDutyRosterSchema,
  createPayrollSchema,
  createLeaveRequestSchema,
  updateLeaveStatusSchema,
} from "../validators/staff.validator.js";

const router = express.Router();

// Public/Authenticated list and stats
router.get("/", verifyToken, getStaff);
router.get("/stats", verifyToken, getStaffStats);

// Duty Rosters
router.get("/rosters", verifyToken, getDutyRosters);
router.post("/rosters", verifyToken, validate({ body: createDutyRosterSchema }), createDutyRoster);
router.put("/rosters/:id", verifyToken, validate({ body: updateDutyRosterSchema }), updateDutyRoster);
router.delete("/rosters/:id", verifyToken, requireRoles("admin"), deleteDutyRoster);

// Payrolls
router.get("/payrolls", verifyToken, getPayrolls);
router.post(
  "/payrolls",
  verifyToken,
  requireRoles("admin"),
  validate({ body: createPayrollSchema }),
  createPayroll
);

// Leave Requests
router.get("/leaves", verifyToken, getLeaveRequests);
router.post("/leaves", verifyToken, validate({ body: createLeaveRequestSchema }), createLeaveRequest);
router.patch(
  "/leaves/:id/status",
  verifyToken,
  requireRoles("admin"),
  validate({ body: updateLeaveStatusSchema }),
  updateLeaveStatus
);

// Staff Profile CRUD
router.get("/:id", verifyToken, getStaffById);
router.post("/", verifyToken, requireRoles("admin"), validate({ body: createStaffSchema }), createStaff);
router.put("/:id", verifyToken, requireRoles("admin"), validate({ body: updateStaffSchema }), updateStaff);
router.delete("/:id", verifyToken, requireRoles("admin"), deleteStaff);

export default router;
