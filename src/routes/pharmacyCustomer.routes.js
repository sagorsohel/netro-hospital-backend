import { Router } from "express";
import {
  getPharmacyCustomers,
  getPharmacyCustomerById,
  createPharmacyCustomer,
  updatePharmacyCustomer,
  deletePharmacyCustomer,
} from "../controllers/pharmacyCustomer.controller.js";
import { verifyPharmacyAccess } from "../middleware/pharmacyAuth.js";

const router = Router();

// Allow authenticated pharmacy staff or admins
router.use(verifyPharmacyAccess);

router.route("/")
  .get(getPharmacyCustomers)
  .post(createPharmacyCustomer);

router.route("/:id")
  .get(getPharmacyCustomerById)
  .put(updatePharmacyCustomer)
  .delete(deletePharmacyCustomer);

export default router;

