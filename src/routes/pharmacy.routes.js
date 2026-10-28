import { Router } from "express";
import {
  getMedicines,
  getMedicineById,
  createStockIn,
  getInvoices,
  createInvoice,
  triggerDeliveryAction,
  getPharmacyStats,
} from "../controllers/pharmacy.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

// Pharmacy Routes (Protected with JWT verifyToken)
router.get("/medicines", verifyToken, getMedicines);
router.get("/medicines/:id", verifyToken, getMedicineById);
router.post("/medicines/stock-in", verifyToken, createStockIn);

router.get("/invoices", verifyToken, getInvoices);
router.post("/invoices", verifyToken, createInvoice);
router.post("/invoices/:id/deliver", verifyToken, triggerDeliveryAction);

router.get("/stats", verifyToken, getPharmacyStats);

export default router;
