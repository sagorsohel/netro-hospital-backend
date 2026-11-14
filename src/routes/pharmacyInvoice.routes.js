import { Router } from "express";
import {
  getPharmacyInvoices,
  getPharmacyInvoiceById,
  createPharmacyInvoice,
} from "../controllers/pharmacyInvoice.controller.js";

const router = Router();

router.get("/", getPharmacyInvoices);
router.post("/", createPharmacyInvoice);
router.get("/:id", getPharmacyInvoiceById);

export default router;

