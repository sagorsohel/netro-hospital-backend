import { db } from "../db/index.js";
import { doctors, departments } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";
import { generateId } from "../utils/generateId.js";

/**
 * @desc Get all doctors with pagination, search & department filter
 * @route GET /api/v1/doctors
 * @access Authenticated (Admin, Staff, Manager, Doctor)
 */
export const getDoctors = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 10);
    const search = getQueryString(req.query, "search");
    const departmentId = getQueryString(req.query, "departmentId");
    const department = getQueryString(req.query, "department");
    const status = getQueryString(req.query, "status");

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

    const whereClause = combineConditions(conditions);

    // Total count
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(doctors)
      .where(whereClause);

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
      pagination: buildPaginationMeta(countResult?.count, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Get single doctor by ID
 * @route GET /api/v1/doctors/:id
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
 * @desc Create new doctor profile (body validated by createDoctorSchema)
 * @route POST /api/v1/doctors
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

    const newDoctorData = {
      id: generateId("doc", 5),
      name,
      departmentId: departmentId || null,
      department,
      specialty: specialty || "",
      experience: experience || "",
      isHead: Boolean(isHead),
      contactNumber: contactNumber || "",
      roomNumber: roomNumber || "",
      serialContactNumber: serialContactNumber || "",
      firstVisitFee: firstVisitFee !== undefined ? String(firstVisitFee) : "1000.00",
      secondVisitFee: secondVisitFee !== undefined ? String(secondVisitFee) : "500.00",
      dailyPatientLimit: dailyPatientLimit || 30,
      consultationStartTime: consultationStartTime || "",
      consultationEndTime: consultationEndTime || "",
      reportConsultationTime: reportConsultationTime || "",
      availableDays: availableDays || ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
      offDays: offDays || "Friday",
      image: image || null,
      email: email || null,
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
 * @desc Update doctor profile (body validated by updateDoctorSchema)
 * @route PUT /api/v1/doctors/:id
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

    const updateData = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (departmentId !== undefined) updateData.departmentId = departmentId || null;
    if (department !== undefined) updateData.department = department;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (experience !== undefined) updateData.experience = experience;
    if (isHead !== undefined) updateData.isHead = isHead;
    if (contactNumber !== undefined) updateData.contactNumber = contactNumber;
    if (roomNumber !== undefined) updateData.roomNumber = roomNumber;
    if (serialContactNumber !== undefined) updateData.serialContactNumber = serialContactNumber;
    if (firstVisitFee !== undefined) updateData.firstVisitFee = String(firstVisitFee);
    if (secondVisitFee !== undefined) updateData.secondVisitFee = String(secondVisitFee);
    if (dailyPatientLimit !== undefined) updateData.dailyPatientLimit = dailyPatientLimit;
    if (consultationStartTime !== undefined) updateData.consultationStartTime = consultationStartTime;
    if (consultationEndTime !== undefined) updateData.consultationEndTime = consultationEndTime;
    if (reportConsultationTime !== undefined) updateData.reportConsultationTime = reportConsultationTime;
    if (availableDays !== undefined) updateData.availableDays = availableDays;
    if (offDays !== undefined) updateData.offDays = offDays;
    if (image !== undefined) updateData.image = image || null;
    if (email !== undefined) updateData.email = email || null;
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
 * @route DELETE /api/v1/doctors/:id
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
