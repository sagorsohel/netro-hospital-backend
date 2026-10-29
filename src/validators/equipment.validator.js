import { z } from "zod";
import {
  requiredString,
  optionalString,
  optionalDate,
  requiredDate,
  optionalNonNegativeNumber,
  optionalPositiveInt,
  nonEmptyUpdate,
} from "./common.js";

const equipmentFields = {
  name: requiredString("Equipment name"),
  modelNo: optionalString(100),
  serialNumber: optionalString(100),
  category: requiredString("Category", 100),
  quantity: optionalPositiveInt("Quantity"),
  roomNumber: optionalString(100),
  floor: optionalString(100),
  department: requiredString("Department"),
  manufacturer: optionalString(),
  purchaseDate: optionalDate("Purchase date"),
  warrantyExpiry: optionalDate("Warranty expiry"),
  status: optionalString(50),
  lastServiceDate: optionalDate("Last service date"),
  nextServiceDate: optionalDate("Next service date"),
  serviceNotes: optionalString(1000),
  technicianContact: optionalString(100),
  photo: optionalString(500),
};

export const createEquipmentSchema = z.object(equipmentFields);

export const updateEquipmentSchema = nonEmptyUpdate(
  z.object({
    ...equipmentFields,
    name: equipmentFields.name.optional(),
    category: equipmentFields.category.optional(),
    department: equipmentFields.department.optional(),
  })
);

export const createMaintenanceLogSchema = z.object({
  equipmentId: requiredString("Equipment ID", 64),
  equipmentName: requiredString("Equipment name"),
  serviceDate: requiredDate("Service date"),
  servicedBy: requiredString("Serviced by"),
  cost: optionalNonNegativeNumber("Cost"),
  description: requiredString("Description", 1000),
  statusAfterService: optionalString(50),
  nextScheduledDate: optionalDate("Next scheduled date"),
});
