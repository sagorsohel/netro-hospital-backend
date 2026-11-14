import { Router } from "express";
import {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
} from "../controllers/medicine.controller.js";

const router = Router();

router.get("/", getMedicines);
router.post("/", createMedicine);
router.get("/:id", getMedicineById);
router.put("/:id", updateMedicine);
router.delete("/:id", deleteMedicine);

export default router;
