import { z } from "zod";
import {
  requiredString,
  optionalString,
  optionalEmail,
  optionalNonNegativeNumber,
  nonEmptyUpdate,
} from "./common.js";

const shareholderFields = {
  name: requiredString("Shareholder name"),
  phone: requiredString("Phone number"),
  email: optionalEmail(),
  nid: optionalString(50),
  ownershipPercentage: optionalNonNegativeNumber("Ownership percentage"),
  investmentAmount: optionalNonNegativeNumber("Investment amount"),
  joinedDate: optionalString(50),
  bankAccountDetails: optionalString(500),
  status: optionalString(50),
  notes: optionalString(1000),
};

export const createShareholderSchema = z.object(shareholderFields);

export const updateShareholderSchema = nonEmptyUpdate(
  z.object({
    ...shareholderFields,
    name: shareholderFields.name.optional(),
    phone: shareholderFields.phone.optional(),
  })
);

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

