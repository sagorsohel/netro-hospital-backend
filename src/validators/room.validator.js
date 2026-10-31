import { z } from "zod";
import {
  requiredString,
  optionalString,
  requiredPositiveNumber,
  optionalPositiveInt,
  optionalNonNegativeNumber,
  jsonArray,
  nonEmptyUpdate,
} from "./common.js";

export const ROOM_STATUSES = ["Available", "Booked", "Maintenance", "Cleaning"];

export const ROOM_TYPES = [
  "General Ward",
  "Single Cabin",
  "Deluxe Cabin",
  "VIP Suite",
  "ICU (Intensive Care)",
  "CCU (Coronary Care)",
  "NICU (Neonatal ICU)",
  "Post-Op Recovery Ward",
  "Emergency Observation",
];

const roomFields = {
  name: requiredString("Room Name"),
  roomNumber: requiredString("Room Number", 100),
  floor: requiredString("Floor Number", 100),
  roomType: optionalString(100),
  department: optionalString(255),
  perDayCharge: requiredPositiveNumber("Per Day Charge"),
  bedCount: optionalPositiveInt("Bed Count"),
  occupiedBeds: optionalNonNegativeNumber("Occupied Beds"),
  status: optionalString(50),
  patientName: optionalString(255),
  admissionId: optionalString(100),
  bedNumbers: jsonArray("Bed Numbers"),
  extraCharges: jsonArray("Extra Charges"),
  amenities: jsonArray("Amenities"),
  notes: optionalString(1000),
};

export const createRoomSchema = z.object(roomFields);

export const updateRoomSchema = nonEmptyUpdate(
  z.object({
    ...roomFields,
    name: roomFields.name.optional(),
    roomNumber: roomFields.roomNumber.optional(),
    floor: roomFields.floor.optional(),
    perDayCharge: roomFields.perDayCharge.optional(),
  })
);

export const updateRoomStatusSchema = z.object({
  status: z.enum(ROOM_STATUSES, {
    error: `Status must be one of: ${ROOM_STATUSES.join(", ")}`,
  }),
  patientName: optionalString(255),
  admissionId: optionalString(100),
  occupiedBeds: optionalNonNegativeNumber("Occupied Beds"),
});

export const roomListQuerySchema = z.object({
  search: optionalString(),
  floor: optionalString(),
  status: optionalString(),
  roomType: optionalString(),
  department: optionalString(),
  page: optionalPositiveInt("Page"),
  limit: optionalPositiveInt("Limit"),
});
