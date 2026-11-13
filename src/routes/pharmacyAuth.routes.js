import { Router } from "express";
import { pharmacyLogin, getPharmacyMe, pharmacyChangePassword } from "../controllers/pharmacyAuth.controller.js";
import { verifyPharmacyToken } from "../middleware/pharmacyAuth.js";
import { validate } from "../middleware/validate.js";
import { pharmacyLoginSchema, pharmacyChangePasswordSchema } from "../validators/pharmacy.validator.js";

// Pharmacy auth — separate from hospital /auth.
// No public registration: owners are created by hospital admins, staff by owners/managers.
const router = Router();

router.post("/login", validate({ body: pharmacyLoginSchema }), pharmacyLogin);
router.get("/me", verifyPharmacyToken, getPharmacyMe);
router.post("/change-password", verifyPharmacyToken, validate({ body: pharmacyChangePasswordSchema }), pharmacyChangePassword);

export default router;
