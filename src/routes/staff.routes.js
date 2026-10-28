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

const router = express.Router();

// Public/Authenticated list and stats
router.get("/", verifyToken, getStaff);
router.get("/stats", verifyToken, getStaffStats);

// Duty Rosters
router.get("/rosters", verifyToken, getDutyRosters);
router.post("/rosters", verifyToken, createDutyRoster);
router.put("/rosters/:id", verifyToken, updateDutyRoster);
router.delete("/rosters/:id", verifyToken, requireRoles("admin"), deleteDutyRoster);

// Payrolls
router.get("/payrolls", verifyToken, getPayrolls);
router.post("/payrolls", verifyToken, requireRoles("admin"), createPayroll);

// Leave Requests
router.get("/leaves", verifyToken, getLeaveRequests);
router.post("/leaves", verifyToken, createLeaveRequest);
router.patch("/leaves/:id/status", verifyToken, requireRoles("admin"), updateLeaveStatus);

// Staff Profile CRUD
router.get("/:id", verifyToken, getStaffById);
router.post("/", verifyToken, requireRoles("admin"), createStaff);
router.put("/:id", verifyToken, requireRoles("admin"), updateStaff);
router.delete("/:id", verifyToken, requireRoles("admin"), deleteStaff);

export default router;
