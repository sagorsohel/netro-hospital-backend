import express from "express";
import {
  getShareholders,
  getShareholderById,
  createShareholder,
  updateShareholder,
  deleteShareholder,
  createShareholderPayout,
} from "../controllers/shareholder.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createShareholderSchema,
  updateShareholderSchema,
  createPayoutSchema,
} from "../validators/shareholder.validator.js";

const router = express.Router();

router.get("/", verifyToken, getShareholders);
router.get("/:id", verifyToken, getShareholderById);
router.post("/", verifyToken, requireRoles("admin"), validate({ body: createShareholderSchema }), createShareholder);
router.put("/:id", verifyToken, requireRoles("admin"), validate({ body: updateShareholderSchema }), updateShareholder);
router.delete("/:id", verifyToken, requireRoles("admin"), deleteShareholder);
router.post("/:id/payouts", verifyToken, requireRoles("admin"), validate({ body: createPayoutSchema }), createShareholderPayout);

export default router;

