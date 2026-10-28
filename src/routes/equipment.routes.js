import express from "express";
import {
  getEquipment,
  getEquipmentStats,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getMaintenanceLogs,
  createMaintenanceLog,
} from "../controllers/equipment.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";

const router = express.Router();

// Inventory & Analytics
router.get("/", verifyToken, getEquipment);
router.get("/stats", verifyToken, getEquipmentStats);

// Maintenance logs
router.get("/maintenance", verifyToken, getMaintenanceLogs);
router.post("/maintenance", verifyToken, requireRoles("admin"), createMaintenanceLog);

// Equipment CRUD
router.get("/:id", verifyToken, getEquipmentById);
router.post("/", verifyToken, requireRoles("admin"), createEquipment);
router.put("/:id", verifyToken, requireRoles("admin"), updateEquipment);
router.delete("/:id", verifyToken, requireRoles("admin"), deleteEquipment);

export default router;
