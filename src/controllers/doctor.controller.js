import { db } from "../db/index.js";
import { doctors, departments } from "../db/schema.js";
import { eq, ilike, or, and, desc, sql } from "drizzle-orm";

/**
 * @desc Get all doctors with pagination, search & department filter
 * @route GET /api/doctors
 * @access Authenticated (Admin, Staff, Manager, Doctor)
 */
export const getDoctors = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;
    const search = req.query.search ? req.query.search.trim() : "";
    const departmentId = req.query.departmentId ? req.query.departmentId.trim() : "";
    const department = req.query.department ? req.query.department.trim() : "";
    const status = req.query.status ? req.query.status.trim() : "";

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(doctors.name, `%${search}%`),
          ilike(doctors.specialty, `%${search}%`),
          ilike(doctors.department, `%${search}%`),
          ilike(doctors.roomNumber, `%${search}%`),
          ilike(doctors.contactNumber, `%${search}%`),
          ilike(doctors.serialContactNumber, `%${search}%`)
        )
      );
    }

    if (departmentId && departmentId !== "all") {
      conditions.push(eq(doctors.departmentId, departmentId));
    } else if (department && department !== "all") {
      conditions.push(ilike(doctors.department, department));
    }

    if (status && status !== "all") {
      conditions.push(eq(doctors.status, status));
    }

    const whereClause =
      conditions.length === 1
        ? conditions[0]
        : conditions.length > 1
        ? and(...conditions)
        : undefined;

    // Total count
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(doctors)
      .where(whereClause);

    const total = parseInt(countResult?.count || "0", 10);
    const totalPages = Math.ceil(total / limit) || 1;

    // Fetch paginated list
    const list = await db
      .select()
      .from(doctors)
      .where(whereClause)
      .orderBy(desc(doctors.createdAt))
      .limit(limit)
      .offset(offset);

    return res.status(200).json({
      success: true,
      data: list,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single doctor by ID
 * @route GET /api/doctors/:id
 * @access Authenticated
 */
export const getDoctorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found with this ID.",
      });
    }

    return res.status(200).json({
      success: true,
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create new doctor profile
 * @route POST /api/doctors
 * @access Admin only
 */
export const createDoctor = async (req, res, next) => {
  try {
    const {
      name,
      departmentId,
      department,
      specialty,
      experience,
      isHead,
      contactNumber,
      roomNumber,
      serialContactNumber,
      firstVisitFee,
      secondVisitFee,
      dailyPatientLimit,
      consultationStartTime,
      consultationEndTime,
      reportConsultationTime,
      availableDays,
      offDays,
      image,
      email,
      status,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Doctor's name is required.",
      });
    }

    if (!department || !department.trim()) {
      return res.status(400).json({
        success: false,
        message: "Department is required.",
      });
    }

    const doctorId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Prepare availableDays json
    let parsedDays = availableDays;
    if (typeof availableDays === "string") {
      try {
        parsedDays = JSON.parse(availableDays);
      } catch {
        parsedDays = availableDays.split(",").map((d) => d.trim());
      }
    }

    const newDoctorData = {
      id: doctorId,
      name: name.trim(),
      departmentId: departmentId || null,
      department: department.trim(),
      specialty: specialty?.trim() || "",
      experience: experience?.trim() || "",
      isHead: Boolean(isHead),
      contactNumber: contactNumber?.trim() || "",
      roomNumber: roomNumber?.trim() || "",
      serialContactNumber: serialContactNumber?.trim() || "",
      firstVisitFee: firstVisitFee ? String(firstVisitFee) : "1000.00",
      secondVisitFee: secondVisitFee ? String(secondVisitFee) : "500.00",
      dailyPatientLimit: dailyPatientLimit ? parseInt(dailyPatientLimit, 10) : 30,
      consultationStartTime: consultationStartTime?.trim() || "",
      consultationEndTime: consultationEndTime?.trim() || "",
      reportConsultationTime: reportConsultationTime?.trim() || "",
      availableDays: parsedDays || ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
      offDays: offDays?.trim() || "Friday",
      image: image || null,
      email: email?.trim() || null,
      status: status || "Active",
      rating: "4.8",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(doctors).values(newDoctorData).returning();

    // Increment doctorsCount in the department if departmentId provided
    if (departmentId) {
      try {
        await db
          .update(departments)
          .set({
            doctorsCount: sql`COALESCE(doctors_count, 0) + 1`,
            updatedAt: new Date(),
          })
          .where(eq(departments.id, departmentId));
      } catch (err) {
        console.warn("Could not increment doctorsCount in department:", err.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Doctor profile successfully registered.",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update doctor profile
 * @route PUT /api/doctors/:id
 * @access Admin only
 */
export const updateDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db.select().from(doctors).where(eq(doctors.id, id));
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found with this ID.",
      });
    }

    const {
      name,
      departmentId,
      department,
      specialty,
      experience,
      isHead,
      contactNumber,
      roomNumber,
      serialContactNumber,
      firstVisitFee,
      secondVisitFee,
      dailyPatientLimit,
      consultationStartTime,
      consultationEndTime,
      reportConsultationTime,
      availableDays,
      offDays,
      image,
      email,
      status,
    } = req.body;

    let parsedDays = availableDays;
    if (typeof availableDays === "string") {
      try {
        parsedDays = JSON.parse(availableDays);
      } catch {
        parsedDays = availableDays.split(",").map((d) => d.trim());
      }
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (department !== undefined) updateData.department = department.trim();
    if (specialty !== undefined) updateData.specialty = specialty.trim();
    if (experience !== undefined) updateData.experience = experience.trim();
    if (isHead !== undefined) updateData.isHead = Boolean(isHead);
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber.trim();
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber.trim();
    if (serialContactNumber !== undefined) updateData.serialContactNumber = serialContactNumber.trim();
    if (firstVisitFee !== undefined) updateData.firstVisitFee = String(firstVisitFee);
    if (secondVisitFee !== undefined) updateData.secondVisitFee = String(secondVisitFee);
    if (dailyPatientLimit !== undefined) updateData.dailyPatientLimit = parseInt(dailyPatientLimit, 10);
    if (consultationStartTime !== undefined) updateData.consultationStartTime = consultationStartTime.trim();
    if (consultationEndTime !== undefined) updateData.consultationEndTime = consultationEndTime.trim();
    if (reportConsultationTime !== undefined) updateData.reportConsultationTime = reportConsultationTime.trim();
    if (availableDays !== undefined) updateData.availableDays = parsedDays;
    if (offDays !== undefined) updateData.offDays = offDays.trim();
    if (image !== undefined) updateData.image = image || null;
    if (email !== undefined) updateData.email = email ? email.trim() : null;
    if (status !== undefined) updateData.status = status;

    const [updated] = await db
      .update(doctors)
      .set(updateData)
      .where(eq(doctors.id, id))
      .returning();

    // If departmentId changed, update doctorsCount in both old & new
    if (departmentId !== undefined && departmentId !== existing.departmentId) {
      if (existing.departmentId) {
        try {
          await db
            .update(departments)
            .set({ doctorsCount: sql`GREATEST(0, COALESCE(doctors_count, 0) - 1)` })
            .where(eq(departments.id, existing.departmentId));
        } catch (err) {
          console.warn("Could not decrement old department count:", err.message);
        }
      }
      if (departmentId) {
        try {
          await db
            .update(departments)
            .set({ doctorsCount: sql`COALESCE(doctors_count, 0) + 1` })
            .where(eq(departments.id, departmentId));
        } catch (err) {
          console.warn("Could not increment new department count:", err.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Doctor profile updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete doctor
 * @route DELETE /api/doctors/:id
 * @access Admin only
 */
export const deleteDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [doctor] = await db.select().from(doctors).where(eq(doctors.id, id));
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found with this ID.",
      });
    }

    await db.delete(doctors).where(eq(doctors.id, id));

    if (doctor.departmentId) {
      try {
        await db
          .update(departments)
          .set({ doctorsCount: sql`GREATEST(0, COALESCE(doctors_count, 0) - 1)` })
          .where(eq(departments.id, doctor.departmentId));
      } catch (err) {
        console.warn("Could not decrement department count:", err.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Doctor ${doctor.name} successfully deleted.`,
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
};
