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
import { validate } from "../middleware/validate.js";
import {
  createEquipmentSchema,
  updateEquipmentSchema,
  createMaintenanceLogSchema,
} from "../validators/equipment.validator.js";

const router = express.Router();

// Inventory & Analytics
router.get("/", verifyToken, getEquipment);
router.get("/stats", verifyToken, getEquipmentStats);

// Maintenance logs
router.get("/maintenance", verifyToken, getMaintenanceLogs);
router.post(
  "/maintenance",
  verifyToken,
  requireRoles("admin"),
  validate({ body: createMaintenanceLogSchema }),
  createMaintenanceLog
);

// Equipment CRUD
router.get("/:id", verifyToken, getEquipmentById);
router.post("/", verifyToken, requireRoles("admin"), validate({ body: createEquipmentSchema }), createEquipment);
router.put("/:id", verifyToken, requireRoles("admin"), validate({ body: updateEquipmentSchema }), updateEquipment);
router.delete("/:id", verifyToken, requireRoles("admin"), deleteEquipment);

export default router;
