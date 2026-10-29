import { z } from "zod";
import { requiredString, optionalString, optionalDate, requiredPositiveNumber, nonEmptyUpdate } from "./common.js";

const expenseFields = {
  title: requiredString("Expense title"),
  description: optionalString(1000),
  date: optionalDate("Date"),
  amount: requiredPositiveNumber("Amount"),
  purpose: optionalString(500),
  category: requiredString("Expense category", 100),
  billCopy: optionalString(500),
  voucherNo: optionalString(100),
  paymentMethod: optionalString(50),
  paidTo: optionalString(),
  status: optionalString(50),
};

export const createExpenseSchema = z.object(expenseFields);

export const updateExpenseSchema = nonEmptyUpdate(
  z.object({
    ...expenseFields,
    title: expenseFields.title.optional(),
    amount: expenseFields.amount.optional(),
    category: expenseFields.category.optional(),
  })
);

export const expenseListQuerySchema = z
  .object({
    startDate: optionalDate("Start date"),
    endDate: optionalDate("End date"),
  })
  .loose();
