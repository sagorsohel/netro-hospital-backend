import { db } from "../db/index.js";
import { departments } from "../db/schema.js";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { getPagination, buildPaginationMeta } from "../utils/pagination.js";
import { combineConditions, getQueryString } from "../utils/query.js";

/**
 * @desc Get all departments with pagination and search
 * @route GET /api/v1/departments
 * @access Public / Authenticated (Admin, Staff, Manager can view)
 */
export const getDepartments = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query, 8);
    const search = getQueryString(req.query, "search");
    const status = getQueryString(req.query, "status");

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(departments.name, `%${search}%`),
          ilike(departments.description, `%${search}%`),
          ilike(departments.headOfDepartment, `%${search}%`)
        )
      );
    }
    if (status && status !== "all") {
      conditions.push(eq(departments.status, status));
    }

    const whereClause = combineConditions(conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: sql`count(*)` })
      .from(departments)
      .where(whereClause);

    // Get paginated departments
    const list = await db
      .select()
      .from(departments)
      .where(whereClause)
      .orderBy(desc(departments.createdAt))
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
 * @desc Get department by ID
 * @route GET /api/v1/departments/:id
 * @access Authenticated
 */
export const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Create new department (Admin only, body validated by createDepartmentSchema)
 * @route POST /api/v1/departments
 * @access Private (Admin only)
 */
export const createDepartment = async (req, res, next) => {
  try {
    const {
      name,
      description,
      icon,
      image,
      headOfDepartment,
      floor,
      roomNumber,
      contactEmail,
      contactPhone,
      status = "Active",
    } = req.body;

    // Generate unique slug
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    const id = `dept-${Date.now()}`;

    const [newDepartment] = await db
      .insert(departments)
      .values({
        id,
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        icon: icon || "Stethoscope",
        image: image || null,
        headOfDepartment: headOfDepartment?.trim() || null,
        floor: floor?.trim() || "1st Floor",
        roomNumber: roomNumber?.trim() || null,
        contactEmail: contactEmail?.trim() || null,
        contactPhone: contactPhone?.trim() || null,
        status: status || "Active",
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Department created successfully.",
      data: newDepartment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Update department (Admin only, body validated by updateDepartmentSchema)
 * @route PUT /api/v1/departments/:id
 * @access Private (Admin only)
 */
export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      icon,
      image,
      headOfDepartment,
      floor,
      roomNumber,
      contactEmail,
      contactPhone,
      doctorsCount,
      status,
    } = req.body;

    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    const [updatedDepartment] = await db
      .update(departments)
      .set({
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description?.trim() : existing.description,
        icon: icon !== undefined ? icon : existing.icon,
        image: image !== undefined ? image : existing.image,
        headOfDepartment: headOfDepartment !== undefined ? headOfDepartment?.trim() : existing.headOfDepartment,
        floor: floor !== undefined ? floor?.trim() : existing.floor,
        roomNumber: roomNumber !== undefined ? roomNumber?.trim() : existing.roomNumber,
        contactEmail: contactEmail !== undefined ? contactEmail?.trim() : existing.contactEmail,
        contactPhone: contactPhone !== undefined ? contactPhone?.trim() : existing.contactPhone,
        doctorsCount: doctorsCount !== undefined ? parseInt(doctorsCount) : existing.doctorsCount,
        status: status !== undefined ? status : existing.status,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: updatedDepartment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Delete department (Admin only)
 * @route DELETE /api/v1/departments/:id
 * @access Private (Admin only)
 */
export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id));

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Department not found.",
      });
    }

    await db.delete(departments).where(eq(departments.id, id));

    return res.status(200).json({
      success: true,
      message: `Department "${existing.name}" deleted successfully.`,
      deletedId: id,
    });
  } catch (error) {
    next(error);
  }
};
