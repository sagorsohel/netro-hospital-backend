import express from "express";
import {
  getSharePlans,
  createSharePlan,
  updateSharePlan,
  updateSharePlanStatus,
} from "../controllers/shareholder.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createPlanSchema, updatePlanSchema, planStatusSchema } from "../validators/shareholder.validator.js";

const router = express.Router();
const admin = [verifyToken, requireRoles("admin", "super_admin")];

router.get("/", verifyToken, requireRoles("admin", "super_admin", "accountant"), getSharePlans);
router.post("/", ...admin, validate({ body: createPlanSchema }), createSharePlan);
router.put("/:planId", ...admin, validate({ body: updatePlanSchema }), updateSharePlan);
router.patch("/:planId", ...admin, validate({ body: updatePlanSchema }), updateSharePlan);
router.patch("/:planId/status", ...admin, validate({ body: planStatusSchema }), updateSharePlanStatus);
// No DELETE: plans used by purchases are deactivated, never removed

export default router;
