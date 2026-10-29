import express from 'express';
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/department.controller.js';
import { verifyToken, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
} from '../validators/department.validator.js';

const router = express.Router();

// Read operations: Available to all authenticated users (Admin, Doctor, Staff, Manager)
router.get('/', verifyToken, getDepartments);
router.get('/:id', verifyToken, getDepartmentById);

// Write/Mutate operations: Strictly restricted to Admin only!
router.post('/', verifyToken, requireRoles('admin'), validate({ body: createDepartmentSchema }), createDepartment);
router.put('/:id', verifyToken, requireRoles('admin'), validate({ body: updateDepartmentSchema }), updateDepartment);
router.delete('/:id', verifyToken, requireRoles('admin'), deleteDepartment);

export default router;
