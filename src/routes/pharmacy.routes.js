import { Router } from "express";
import {
  createPharmacy,
  getPharmacies,
  getPharmacyById,
  updatePharmacy,
  updatePharmacyStatus,
  resetOwnerPassword,
} from "../controllers/pharmacy.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  pharmacyIdParamSchema,
  createPharmacySchema,
  updatePharmacySchema,
  pharmacyStatusSchema,
  listPharmaciesQuerySchema,
  resetPasswordSchema,
} from "../validators/pharmacy.validator.js";

// Pharmacy registry — hospital admins only.
// Middleware is applied per route (not router.use) because /pharmacies/:pharmacyId/users
// is served by pharmacyUser.routes.js with pharmacy-token auth.
const router = Router();
const adminOnly = [verifyToken, requireRoles("admin")];
const withId = validate({ params: pharmacyIdParamSchema });

router.get("/", ...adminOnly, validate({ query: listPharmaciesQuerySchema }), getPharmacies);
router.post("/", ...adminOnly, validate({ body: createPharmacySchema }), createPharmacy);
router.get("/:pharmacyId", ...adminOnly, withId, getPharmacyById);
router.put("/:pharmacyId", ...adminOnly, withId, validate({ body: updatePharmacySchema }), updatePharmacy);
router.patch("/:pharmacyId/status", ...adminOnly, withId, validate({ body: pharmacyStatusSchema }), updatePharmacyStatus);
router.post(
  "/:pharmacyId/reset-owner-password",
  ...adminOnly,
  withId,
  validate({ body: resetPasswordSchema }),
  resetOwnerPassword
);

export default router;
