import {
  pgTable,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// 1. Users table (Admins, Pharmacists, Doctors, Staff)
export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("staff"), // 'admin', 'pharmacist', 'doctor', 'staff'
  branchName: varchar("branch_name", { length: 255 }).default("Main Hospital"),
  avatar: varchar("avatar", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. Doctors table
export const doctors = pgTable("doctors", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  departmentId: varchar("department_id", { length: 64 }),
  department: varchar("department", { length: 255 }).notNull(),
  specialty: varchar("specialty", { length: 255 }),
  experience: varchar("experience", { length: 100 }),
  isHead: boolean("is_head").default(false),
  contactNumber: varchar("contact_number", { length: 50 }),
  roomNumber: varchar("room_number", { length: 100 }),
  serialContactNumber: varchar("serial_contact_number", { length: 50 }),
  firstVisitFee: numeric("first_visit_fee", { precision: 10, scale: 2 }).default("1000.00"),
  secondVisitFee: numeric("second_visit_fee", { precision: 10, scale: 2 }).default("500.00"),
  dailyPatientLimit: integer("daily_patient_limit").default(30),
  consultationStartTime: varchar("consultation_start_time", { length: 50 }),
  consultationEndTime: varchar("consultation_end_time", { length: 50 }),
  reportConsultationTime: varchar("report_consultation_time", { length: 100 }),
  availableDays: jsonb("available_days"),
  offDays: varchar("off_days", { length: 100 }),
  image: varchar("image", { length: 500 }),
  email: varchar("email", { length: 255 }),
  status: varchar("status", { length: 50 }).default("Active"),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("4.8"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 3. Patients table
export const patients = pgTable("patients", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  age: integer("age"),
  gender: varchar("gender", { length: 20 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  bloodGroup: varchar("blood_group", { length: 10 }),
  address: varchar("address", { length: 500 }),
  memberId: varchar("member_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Appointments table
export const appointments = pgTable("appointments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  patientId: varchar("patient_id", { length: 64 }),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  doctorId: varchar("doctor_id", { length: 64 }),
  doctorName: varchar("doctor_name", { length: 255 }).notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("Pending"), // 'Confirmed', 'Pending', 'Completed', 'Cancelled'
  type: varchar("type", { length: 100 }).default("Consultation"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Medicines table (Pharmacy multi-unit stock)
export const medicines = pgTable("medicines", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  generic: varchar("generic", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  cartonQty: integer("carton_qty").default(0),
  packetPerCarton: integer("packet_per_carton").default(10),
  piecePerPacket: integer("piece_per_packet").default(10),
  totalPieces: integer("total_pieces").default(0),
  unitSellingPrice: numeric("unit_selling_price", { precision: 10, scale: 2 }).notNull(),
  stripSellingPrice: numeric("strip_selling_price", { precision: 10, scale: 2 }).notNull(),
  batchNo: varchar("batch_no", { length: 100 }).notNull(),
  expiryDate: varchar("expiry_date", { length: 50 }).notNull(),
  minThresholdPieces: integer("min_threshold_pieces").default(100),
  supplier: varchar("supplier", { length: 255 }),
  branch: varchar("branch", { length: 255 }).default("Main Hospital Pharmacy"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Pharmacy Invoices table (POS sales & messaging)
export const pharmacyInvoices = pgTable("pharmacy_invoices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  invoiceNo: varchar("invoice_no", { length: 100 }).unique().notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  memberId: varchar("member_id", { length: 50 }),
  isMember: boolean("is_member").default(false),
  hasPrescription: boolean("has_prescription").default(false),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  discountPercentage: numeric("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  grandTotal: numeric("grand_total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).default("Paid"),
  whatsappSent: boolean("whatsapp_sent").default(false),
  smsSent: boolean("sms_sent").default(false),
  items: jsonb("items").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Departments table
export const departments = pgTable("departments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: varchar("description", { length: 1000 }),
  icon: varchar("icon", { length: 500 }),
  image: varchar("image", { length: 500 }),
  headOfDepartment: varchar("head_of_department", { length: 255 }),
  floor: varchar("floor", { length: 100 }),
  roomNumber: varchar("room_number", { length: 100 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  doctorsCount: integer("doctors_count").default(0),
  status: varchar("status", { length: 50 }).default("Active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 8. Expenses table (Hospital Expense Management)
export const expenses = pgTable("expenses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  date: varchar("date", { length: 50 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  purpose: varchar("purpose", { length: 500 }),
  category: varchar("category", { length: 100 }).notNull(),
  billCopy: varchar("bill_copy", { length: 500 }),
  voucherNo: varchar("voucher_no", { length: 100 }),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Cash"),
  paidTo: varchar("paid_to", { length: 255 }),
  status: varchar("status", { length: 50 }).default("Paid"),
  recordedBy: varchar("recorded_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 9. Staff Profiles table (Section 4.5 HR & Staff)
export const staff = pgTable("staff", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  designation: varchar("designation", { length: 100 }).notNull(), // Nurse, OT Tech, Lab In-charge, etc.
  departmentId: varchar("department_id", { length: 64 }),
  department: varchar("department", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  address: varchar("address", { length: 500 }),
  photo: varchar("photo", { length: 500 }),
  joiningDate: varchar("joining_date", { length: 50 }),
  salary: numeric("salary", { precision: 12, scale: 2 }).default("25000.00"),
  bloodGroup: varchar("blood_group", { length: 10 }),
  emergencyContact: varchar("emergency_contact", { length: 50 }),
  qualification: varchar("qualification", { length: 255 }),
  documents: jsonb("documents").default([]),
  status: varchar("status", { length: 50 }).default("Active"), // 'Active', 'On Leave', 'Resigned'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 10. Duty Rosters & Shift Planning (Section 4.5 Shift & Roster Management)
export const dutyRosters = pgTable("duty_rosters", {
  id: varchar("id", { length: 64 }).primaryKey(),
  staffId: varchar("staff_id", { length: 64 }).notNull(),
  staffName: varchar("staff_name", { length: 255 }).notNull(),
  staffRole: varchar("staff_role", { length: 100 }),
  department: varchar("department", { length: 255 }).notNull(),
  shift: varchar("shift", { length: 100 }).notNull(), // 'Morning (08:00 AM - 04:00 PM)', 'Evening (04:00 PM - 12:00 AM)', 'Night (12:00 AM - 08:00 AM)'
  date: varchar("date", { length: 50 }).notNull(),
  wardOrRoom: varchar("ward_or_room", { length: 100 }),
  status: varchar("status", { length: 50 }).default("Scheduled"), // 'Scheduled', 'Present', 'Completed', 'Absent'
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// 11. Salary & Payroll Management (Section 4.5 Salary Management)
export const payrolls = pgTable("payrolls", {
  id: varchar("id", { length: 64 }).primaryKey(),
  staffId: varchar("staff_id", { length: 64 }).notNull(),
  staffName: varchar("staff_name", { length: 255 }).notNull(),
  month: varchar("month", { length: 50 }).notNull(), // e.g. "October 2026"
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull(),
  bonus: numeric("bonus", { precision: 12, scale: 2 }).default("0.00"),
  deduction: numeric("deduction", { precision: 12, scale: 2 }).default("0.00"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 50 }).default("Paid"), // 'Paid', 'Pending'
  paymentDate: varchar("payment_date", { length: 50 }),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Bank Transfer"),
  remarks: varchar("remarks", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// 12. Leave Management (Section 4.5 Leave Management)
export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  staffId: varchar("staff_id", { length: 64 }).notNull(),
  staffName: varchar("staff_name", { length: 255 }).notNull(),
  leaveType: varchar("leave_type", { length: 100 }).notNull(), // 'Casual Leave', 'Sick Leave', 'Annual Leave', 'Maternity Leave', 'Emergency Leave'
  startDate: varchar("start_date", { length: 50 }).notNull(),
  endDate: varchar("end_date", { length: 50 }).notNull(),
  totalDays: integer("total_days").notNull().default(1),
  reason: varchar("reason", { length: 500 }).notNull(),
  status: varchar("status", { length: 50 }).default("Pending"), // 'Pending', 'Approved', 'Rejected'
  approvedBy: varchar("approved_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// 13. Equipment Inventory & Tracking (Section 4.6 Equipment Tracking)
export const equipment = pgTable("equipment", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  modelNo: varchar("model_no", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  category: varchar("category", { length: 100 }).notNull(), // 'Diagnostic Imaging', 'Surgical & OT', 'Intensive Care (ICU)', etc.
  quantity: integer("quantity").default(1),
  roomNumber: varchar("room_number", { length: 100 }),
  floor: varchar("floor", { length: 100 }),
  department: varchar("department", { length: 255 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  purchaseDate: varchar("purchase_date", { length: 50 }),
  warrantyExpiry: varchar("warranty_expiry", { length: 50 }),
  status: varchar("status", { length: 50 }).default("Functional"), // 'Functional', 'Under Maintenance', 'Non-functional'
  lastServiceDate: varchar("last_service_date", { length: 50 }),
  nextServiceDate: varchar("next_service_date", { length: 50 }),
  serviceNotes: varchar("service_notes", { length: 1000 }),
  technicianContact: varchar("technician_contact", { length: 100 }),
  photo: varchar("photo", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 14. Equipment Servicing & Maintenance Logs (Section 4.6 Maintenance History)
export const maintenanceLogs = pgTable("maintenance_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  equipmentId: varchar("equipment_id", { length: 64 }).notNull(),
  equipmentName: varchar("equipment_name", { length: 255 }).notNull(),
  serviceDate: varchar("service_date", { length: 50 }).notNull(),
  servicedBy: varchar("serviced_by", { length: 255 }).notNull(),
  cost: numeric("cost", { precision: 12, scale: 2 }).default("0.00"),
  description: varchar("description", { length: 1000 }).notNull(),
  statusAfterService: varchar("status_after_service", { length: 50 }).default("Functional"),
  nextScheduledDate: varchar("next_scheduled_date", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

