import { Router } from "express";

import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import departmentRoutes from "./department.routes.js";
import doctorRoutes from "./doctor.routes.js";
import expenseRoutes from "./expense.routes.js";
import staffRoutes from "./staff.routes.js";
import equipmentRoutes from "./equipment.routes.js";
import uploadRoutes from "./upload.routes.js";

// API v1 — mounted at /api/v1 in app.js
const router = Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/departments", departmentRoutes);
router.use("/doctors", doctorRoutes);
router.use("/expenses", expenseRoutes);
router.use("/staff", staffRoutes);
router.use("/equipment", equipmentRoutes);
router.use("/upload", uploadRoutes);

export default router;
