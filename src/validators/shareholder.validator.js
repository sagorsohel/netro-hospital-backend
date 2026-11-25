import { z } from "zod";
import {
  requiredString,
  optionalString,
  optionalEmail,
  optionalNonNegativeNumber,
  optionalDate,
  nonEmptyUpdate,
} from "./common.js";

export const SHAREHOLDER_STATUSES = ["Draft", "Pending", "Active", "Inactive", "Rejected"];
export const IDENTITY_TYPES = ["NATIONAL_ID", "PASSPORT", "BIRTH_REGISTRATION", "OTHER"];
export const PAYMENT_TYPES = ["FULL_PAYMENT", "INSTALLMENT"];
export const PAYMENT_STATUSES = ["UNPAID", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"];
export const PLAN_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"];

const enumOptional = (values, label) =>
  z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.enum(values, { error: `${label} must be one of: ${values.join(", ")}` }).optional()
  );

const notFutureDate = (label) =>
  optionalDate(label).refine((d) => !d || d <= new Date().toISOString().slice(0, 10), {
    message: `${label} cannot be in the future.`,
  });

const addressSchema = z
  .object({
    house: optionalString(500),
    area: optionalString(255),
    postalCode: optionalString(20),
    zilla: optionalString(100),
    division: optionalString(100),
    country: optionalString(100),
  })
  .partial()
  .optional()
  .nullable();

const nomineeSchema = z.object({
  name: requiredString("Nominee name"),
  phone: optionalString(50),
  // optional; when given it must be 0 < x <= 100
  sharePercent: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce
      .number({ error: "Nominee share % must be a number." })
      .gt(0, "Nominee share % must be more than 0.")
      .max(100, "Nominee share % cannot be more than 100.")
      .optional()
  ),
  relationship: optionalString(100),
  address: optionalString(500),
  nid: optionalString(50), // optional nominee NID / birth reg. number
  photo: optionalString(500), // optional nominee photo URL
});

const money = (label) => optionalNonNegativeNumber(label);

// One share purchase row as sent with the shareholder form.
// `id` present = update that purchase; missing = new purchase.
export const purchaseSchema = z
  .object({
    id: optionalString(64),
    planId: optionalString(64),
    planName: optionalString(255),
    shareNumber: requiredString("Share number", 100),
    paymentType: enumOptional(PAYMENT_TYPES, "Payment type"),
    purchaseDate: optionalDate("Purchase date"),
    referenceName: optionalString(255),
    quantity: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().positive().optional()),
    totalAmount: money("Total amount"),
    paidAmount: money("Paid amount"),
    paymentStatus: enumOptional(PAYMENT_STATUSES, "Payment status"),
    transactionReference: optionalString(255),
    notes: optionalString(1000),
  })
  .refine((p) => p.planId || p.planName, { message: "Select a share plan / package.", path: ["planId"] })
  .refine((p) => p.totalAmount === undefined || p.paidAmount === undefined || p.paidAmount <= p.totalAmount, {
    message: "Paid amount cannot be more than the total amount.",
    path: ["paidAmount"],
  });

const password = z
  .string()
  .min(6, "Password must be at least 6 characters.")
  .max(100, "Password must be at most 100 characters.");

// Share % is optional per nominee, but the ones given can't add up to more than 100%
const nomineesTotalOk = (nominees) =>
  (nominees || []).reduce((s, n) => s + (Number(n.sharePercent) || 0), 0) <= 100.001;

const uniqueShareNumbers = (purchases) => {
  const nums = (purchases || []).map((p) => p.shareNumber.trim().toLowerCase());
  return new Set(nums).size === nums.length;
};

const shareholderFields = {
  name: requiredString("Shareholder name"),
  phone: requiredString("Phone number"),
  email: optionalEmail(),
  identityType: enumOptional(IDENTITY_TYPES, "Identity type"),
  nid: optionalString(50),
  nidFrontImage: optionalString(500),
  nidBackImage: optionalString(500),
  ownershipPercentage: optionalNonNegativeNumber("Ownership percentage"),
  investmentAmount: optionalNonNegativeNumber("Investment amount"),
  joinedDate: optionalString(50),
  bankAccountDetails: optionalString(500),
  status: enumOptional(SHAREHOLDER_STATUSES, "Status"),
  notes: optionalString(1000),

  photo: optionalString(500),
  tinNumber: optionalString(50),
  gender: optionalString(20),
  dateOfBirth: notFutureDate("Date of birth"),
  religion: optionalString(50),
  maritalStatus: optionalString(30),
  fatherName: optionalString(255),
  motherName: optionalString(255),
  spouseName: optionalString(255),
  presentAddress: addressSchema,
  permanentAddress: addressSchema,
  nominees: z.array(nomineeSchema).max(10, "At most 10 nominees.").optional(),
  purchases: z.array(purchaseSchema).max(200).optional(),
};

const NOMINEE_TOTAL = { message: "Nominee shares cannot add up to more than 100%.", path: ["nominees"] };
const SHARE_NO_DUP = { message: "The same share number is entered twice.", path: ["purchases"] };

export const createShareholderSchema = z
  .object({
    ...shareholderFields,
    loginEmail: optionalEmail(),
    loginPassword: password.optional(),
  })
  .refine((d) => nomineesTotalOk(d.nominees), NOMINEE_TOTAL)
  .refine((d) => uniqueShareNumbers(d.purchases), SHARE_NO_DUP)
  .refine((d) => !d.loginEmail || !!d.loginPassword, {
    message: "Password is required to create a login account.",
    path: ["loginPassword"],
  });

export const updateShareholderSchema = nonEmptyUpdate(
  z.object({
    ...shareholderFields,
    name: shareholderFields.name.optional(),
    phone: shareholderFields.phone.optional(),
  })
)
  .refine((d) => nomineesTotalOk(d.nominees), NOMINEE_TOTAL)
  .refine((d) => uniqueShareNumbers(d.purchases), SHARE_NO_DUP);

export const shareholderStatusSchema = z.object({
  status: z.enum(SHAREHOLDER_STATUSES, { error: `Status must be one of: ${SHAREHOLDER_STATUSES.join(", ")}` }),
  reason: optionalString(500),
});

export const shareholderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: optionalString(100),
  status: optionalString(20),
  planId: optionalString(64),
  paymentStatus: optionalString(20),
});

export const createAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email("Please provide a valid email address."),
  password,
});

export const updateAccountSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Please provide a valid email address.").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.email !== undefined || d.isActive !== undefined, {
    message: "Provide email or isActive.",
  });

export const resetPasswordSchema = z.object({ newPassword: password });

// ---- Share plans ----
const planFields = {
  code: requiredString("Plan code", 50).transform((v) => v.toUpperCase().replace(/\s+/g, "-")),
  name: requiredString("Plan name"),
  description: optionalString(1000),
  planYear: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().int().min(2000).max(2100).optional()),
  price: optionalNonNegativeNumber("Price"),
  currency: optionalString(10),
  status: enumOptional(PLAN_STATUSES, "Plan status"),
};
export const createPlanSchema = z.object(planFields);
export const updatePlanSchema = nonEmptyUpdate(
  z.object({ ...planFields, code: planFields.code.optional(), name: planFields.name.optional() })
);
export const planStatusSchema = z.object({ status: z.enum(PLAN_STATUSES) });

export const createPayoutSchema = z.object({
  shareholderId: requiredString("Shareholder ID"),
  amount: optionalNonNegativeNumber("Payout amount"),
  period: requiredString("Period"),
  paymentDate: requiredString("Payment date"),
  paymentMethod: optionalString(50),
  transactionRef: optionalString(100),
  status: optionalString(50),
  notes: optionalString(500),
});
