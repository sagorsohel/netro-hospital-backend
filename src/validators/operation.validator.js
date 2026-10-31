import { z } from "zod";
import {
  requiredString,
  optionalString,
  requiredPositiveNumber,
  optionalNonNegativeNumber,
  optionalPositiveInt,
  optionalBoolean,
  nonEmptyUpdate,
} from "./common.js";

const operationFields = {
  name: requiredString("Operation Name"),
  category: optionalString(100),
  price: requiredPositiveNumber("Operation Price"),
  canDiscount: optionalBoolean(),
  maxDiscountPercent: optionalNonNegativeNumber("Discount Percentage"),
  doctorId: optionalString(64),
  doctorName: optionalString(255),
  roomNumber: optionalString(100),
  duration: optionalString(100),
  anesthesiaType: optionalString(100),
  description: optionalString(1000),
  status: optionalString(50),
};

export const createOperationSchema = z.object(operationFields);

export const updateOperationSchema = nonEmptyUpdate(
  z.object({
    ...operationFields,
    name: operationFields.name.optional(),
    price: operationFields.price.optional(),
  })
);

export const operationQuerySchema = z.object({
  search: optionalString(),
  category: optionalString(),
  doctorId: optionalString(),
  status: optionalString(),
  page: optionalPositiveInt("Page"),
  limit: optionalPositiveInt("Limit"),
});
