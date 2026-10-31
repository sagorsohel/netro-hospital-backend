import express from "express";
import {
  getOperations,
  getOperationById,
  createOperation,
  updateOperation,
  deleteOperation,
} from "../controllers/operation.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createOperationSchema,
  updateOperationSchema,
  operationQuerySchema,
} from "../validators/operation.validator.js";

const router = express.Router();

// Read & Search (Authenticated users)
router.get("/", verifyToken, validate({ query: operationQuerySchema }), getOperations);
router.get("/:id", verifyToken, getOperationById);

// Create & Update (Staff & Admin)
router.post("/", verifyToken, validate({ body: createOperationSchema }), createOperation);
router.put("/:id", verifyToken, validate({ body: updateOperationSchema }), updateOperation);

// Delete (Admin only)
router.delete("/:id", verifyToken, requireRoles("admin"), deleteOperation);

export default router;
