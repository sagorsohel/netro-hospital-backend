import { db } from "../db/index.js";
import { doctors } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

export const getDoctors = async (req, res, next) => {
  try {
    const allDoctors = await db
      .select()
      .from(doctors)
      .orderBy(desc(doctors.createdAt));
    res.json({ success: true, count: allDoctors.length, data: allDoctors });
  } catch (error) {
    next(error);
  }
};

export const getDoctorById = async (req, res, next) => {
  try {
    const [doctor] = await db
      .select()
      .from(doctors)
      .where(eq(doctors.id, req.params.id));

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }
    res.json({ success: true, data: doctor });
  } catch (error) {
    next(error);
  }
};

export const createDoctor = async (req, res, next) => {
  try {
    const {
      name,
      specialty,
      experience,
      rating = "4.8",
      availability = "Available Today",
      phone,
      email,
      department,
      image,
    } = req.body;

    if (!name || !specialty) {
      return res.status(400).json({
        success: false,
        message: "Doctor name and specialty are required.",
      });
    }

    const newDoctor = {
      id: `doc-${Date.now()}`,
      name,
      specialty,
      experience: experience || "5 years",
      rating: rating.toString(),
      availability,
      phone: phone || null,
      email: email || null,
      department: department || specialty,
      image: image || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80",
    };

    await db.insert(doctors).values(newDoctor);
    res.status(201).json({ success: true, data: newDoctor });
  } catch (error) {
    next(error);
  }
};
