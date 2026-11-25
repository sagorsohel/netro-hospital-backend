import express from "express";
import {
  getShareholders,
  getShareholderById,
  createShareholder,
  updateShareholder,
  updateShareholderStatus,
  deleteShareholder,
  getShareholderAuditLogs,
  createShareholderPayout,
  createShareholderAccount,
  updateShareholderAccount,
  resetShareholderPassword,
  getMyShareholderProfile,
} from "../controllers/shareholder.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createShareholderSchema,
  updateShareholderSchema,
  shareholderStatusSchema,
  shareholderListQuerySchema,
  createPayoutSchema,
  createAccountSchema,
  updateAccountSchema,
  resetPasswordSchema,
} from "../validators/shareholder.validator.js";

const router = express.Router();
const admin = [verifyToken, requireRoles("admin", "super_admin")];
const staffRead = [verifyToken, requireRoles("admin", "super_admin", "accountant")];

// Shareholder's own read-only record (identity from the token) — before /:id
router.get("/me", verifyToken, requireRoles("shareholder"), getMyShareholderProfile);

router.get("/", ...staffRead, validate({ query: shareholderListQuerySchema }), getShareholders);
router.get("/:id", ...staffRead, getShareholderById);
router.get("/:id/audit-logs", ...admin, getShareholderAuditLogs);

router.post("/", ...admin, validate({ body: createShareholderSchema }), createShareholder);
router.put("/:id", ...admin, validate({ body: updateShareholderSchema }), updateShareholder);
router.patch("/:id", ...admin, validate({ body: updateShareholderSchema }), updateShareholder);
router.patch("/:id/status", ...admin, validate({ body: shareholderStatusSchema }), updateShareholderStatus);
router.delete("/:id", ...admin, deleteShareholder); // soft delete
router.post("/:id/payouts", ...admin, validate({ body: createPayoutSchema }), createShareholderPayout);

// Login account management
router.post("/:id/account", ...admin, validate({ body: createAccountSchema }), createShareholderAccount);
router.put("/:id/account", ...admin, validate({ body: updateAccountSchema }), updateShareholderAccount);
router.put("/:id/account/reset-password", ...admin, validate({ body: resetPasswordSchema }), resetShareholderPassword);

export default router;
