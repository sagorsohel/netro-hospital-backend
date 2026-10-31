import express from "express";
import {
  getTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
} from "../controllers/test.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createTestSchema,
  updateTestSchema,
  testQuerySchema,
} from "../validators/test.validator.js";

const router = express.Router();

// Read & Search (Authenticated users)
router.get("/", verifyToken, validate({ query: testQuerySchema }), getTests);
router.get("/:id", verifyToken, getTestById);

// Create & Update (Staff & Admin)
router.post("/", verifyToken, validate({ body: createTestSchema }), createTest);
router.put("/:id", verifyToken, validate({ body: updateTestSchema }), updateTest);

// Delete (Admin only)
router.delete("/:id", verifyToken, requireRoles("admin"), deleteTest);

export default router;
