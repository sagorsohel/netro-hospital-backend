import { db } from "../db/index.js";
import { patients } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export const getPatients = async (req, res, next) => {
  try {
    const allPatients = await db
      .select()
      .from(patients)
      .orderBy(desc(patients.createdAt));
    res.json({ success: true, count: allPatients.length, data: allPatients });
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (req, res, next) => {
  try {
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, req.params.id));

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }
    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

export const createPatient = async (req, res, next) => {
  try {
    const { name, age, gender, phone, email, bloodGroup, address, memberId } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Patient name and phone are required.",
      });
    }

    const newPatient = {
      id: `pat-${Date.now()}`,
      name,
      age: age ? Number(age) : null,
      gender: gender || "Other",
      phone,
      email: email || null,
      bloodGroup: bloodGroup || null,
      address: address || null,
      memberId: memberId || null,
    };

    await db.insert(patients).values(newPatient);
    res.status(201).json({ success: true, data: newPatient });
  } catch (error) {
    next(error);
  }
};
