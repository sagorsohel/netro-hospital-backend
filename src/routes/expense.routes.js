import express from "express";
import {
  getExpenses,
  getExpenseStats,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expense.controller.js";
import { verifyToken, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseListQuerySchema,
} from "../validators/expense.validator.js";

const router = express.Router();

// Read operations: Available to authenticated users
router.get("/", verifyToken, validate({ query: expenseListQuerySchema }), getExpenses);
router.get("/stats", verifyToken, getExpenseStats);
router.get("/:id", verifyToken, getExpenseById);

// Create and Edit: Authenticated staff / admins
router.post("/", verifyToken, validate({ body: createExpenseSchema }), createExpense);
router.put("/:id", verifyToken, validate({ body: updateExpenseSchema }), updateExpense);

// Delete: Strictly Admin only
router.delete("/:id", verifyToken, requireRoles("admin"), deleteExpense);

export default router;
