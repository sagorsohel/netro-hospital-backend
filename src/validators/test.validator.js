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

const testFields = {
  name: requiredString("Test Name"),
  code: optionalString(50),
  category: optionalString(100),
  price: requiredPositiveNumber("Test Price"),
  isDiscountable: optionalBoolean(),
  discountPercent: optionalNonNegativeNumber("Discount Percentage"),
  roomNumber: optionalString(100),
  sampleType: optionalString(100),
  deliveryTime: optionalString(100),
  normalRange: optionalString(500),
  description: optionalString(1000),
  status: optionalString(50),
};

export const createTestSchema = z.object(testFields);

export const updateTestSchema = nonEmptyUpdate(
  z.object({
    ...testFields,
    name: testFields.name.optional(),
    price: testFields.price.optional(),
  })
);

export const testQuerySchema = z.object({
  search: optionalString(),
  category: optionalString(),
  status: optionalString(),
  page: optionalPositiveInt("Page"),
  limit: optionalPositiveInt("Limit"),
});
