import { Router } from "express";

import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import departmentRoutes from "./department.routes.js";
import doctorRoutes from "./doctor.routes.js";
import expenseRoutes from "./expense.routes.js";
import staffRoutes from "./staff.routes.js";
import equipmentRoutes from "./equipment.routes.js";
import uploadRoutes from "./upload.routes.js";
import roomRoutes from "./room.routes.js";
import operationRoutes from "./operation.routes.js";
import testRoutes from "./test.routes.js";
import patientRoutes from "./patient.routes.js";
import admissionRoutes from "./admission.routes.js";
import diagnosticInvoiceRoutes from "./diagnosticInvoice.routes.js";
import appointmentRoutes from "./appointment.routes.js";
import shareholderRoutes from "./shareholder.routes.js";
import pharmacyRoutes from "./pharmacy.routes.js";
import pharmacyUserRoutes from "./pharmacyUser.routes.js";
import pharmacyAuthRoutes from "./pharmacyAuth.routes.js";
import medicineRoutes from "./medicine.routes.js";
import pharmacyInvoiceRoutes from "./pharmacyInvoice.routes.js";
import pharmacyCustomerRoutes from "./pharmacyCustomer.routes.js";

// API v1 — mounted at /api/v1 in app.js
const router = Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/departments", departmentRoutes);
router.use("/doctors", doctorRoutes);
router.use("/expenses", expenseRoutes);
router.use("/staff", staffRoutes);
router.use("/equipment", equipmentRoutes);
router.use("/rooms", roomRoutes);
router.use("/operations", operationRoutes);
router.use("/tests", testRoutes);
router.use("/patients", patientRoutes);
router.use("/admissions", admissionRoutes);
router.use("/diagnostic-invoices", diagnosticInvoiceRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/serials", appointmentRoutes);
router.use("/shareholders", shareholderRoutes);

// Pharmacy system (separate auth from hospital users)
router.use("/pharmacy-auth", pharmacyAuthRoutes);
router.use("/pharmacies/:pharmacyId/users", pharmacyUserRoutes); // before /pharmacies
router.use("/pharmacies/:pharmacyId/customers", pharmacyCustomerRoutes);
router.use("/pharmacy-customers", pharmacyCustomerRoutes);
router.use("/pharmacies", pharmacyRoutes);
router.use("/medicines", medicineRoutes);
router.use("/pharmacy-invoices", pharmacyInvoiceRoutes);
router.use("/upload", uploadRoutes);

export default router;
