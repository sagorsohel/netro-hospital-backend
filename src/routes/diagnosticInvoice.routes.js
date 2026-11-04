import express from "express";
import {
  createDiagnosticInvoice,
  getDiagnosticInvoices,
  getDiagnosticInvoiceById,
  settleDiagnosticDue,
} from "../controllers/diagnosticInvoice.controller.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// List diagnostic invoices
router.get("/", verifyToken, getDiagnosticInvoices);

// Single invoice detail
router.get("/:id", verifyToken, getDiagnosticInvoiceById);

// Create diagnostic POS invoice (auto-create patient, calculate discount, paid, due)
router.post("/", verifyToken, createDiagnosticInvoice);

// Settle due payment
router.patch("/:id/due", verifyToken, settleDiagnosticDue);

export default router;
