import { Router } from "express";
import {
  getPharmacyUsers,
  getPharmacyUserById,
  createPharmacyUser,
  updatePharmacyUser,
  resetPharmacyUserPassword,
  deletePharmacyUser,
} from "../controllers/pharmacyUser.controller.js";
import { verifyPharmacyAccess, requireSamePharmacy, requirePharmacyRoles } from "../middleware/pharmacyAuth.js";
import { validate } from "../middleware/validate.js";
import {
  pharmacyIdParamSchema,
  pharmacyUserParamSchema,
  createPharmacyUserSchema,
  updatePharmacyUserSchema,
  listPharmacyUsersQuerySchema,
  resetPasswordSchema,
} from "../validators/pharmacy.validator.js";

// Mounted at /pharmacies/:pharmacyId/users
// Accessible by the pharmacy's own owner/manager, or any hospital admin.
// Finer rules (managers can't touch owners/managers, last owner protected) live in the controller.
const router = Router({ mergeParams: true });

const access = [verifyPharmacyAccess, requirePharmacyRoles("owner", "manager")];
const forPharmacy = [validate({ params: pharmacyIdParamSchema }), requireSamePharmacy];
const forUser = [validate({ params: pharmacyUserParamSchema }), requireSamePharmacy];

router.get("/", ...access, ...forPharmacy, validate({ query: listPharmacyUsersQuerySchema }), getPharmacyUsers);
router.post("/", ...access, ...forPharmacy, validate({ body: createPharmacyUserSchema }), createPharmacyUser);
router.get("/:userId", ...access, ...forUser, getPharmacyUserById);
router.put("/:userId", ...access, ...forUser, validate({ body: updatePharmacyUserSchema }), updatePharmacyUser);
router.post(
  "/:userId/reset-password",
  ...access,
  ...forUser,
  validate({ body: resetPasswordSchema }),
  resetPharmacyUserPassword
);
router.delete("/:userId", ...access, ...forUser, deletePharmacyUser);

export default router;
