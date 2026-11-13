import {
  pgTable,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  text,
  uniqueIndex,
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

// 3. Patients table (Permanent Digital Profile)
export const patients = pgTable("patients", {
  id: varchar("id", { length: 64 }).primaryKey(),
  patientId: varchar("patient_id", { length: 64 }).unique(), // Auto-generated unique e.g. PAT-2026-0001
  name: varchar("name", { length: 255 }).notNull(),
  age: integer("age"),
  dob: varchar("dob", { length: 50 }),
  gender: varchar("gender", { length: 20 }),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  bloodGroup: varchar("blood_group", { length: 10 }),
  address: varchar("address", { length: 500 }),
  guardianName: varchar("guardian_name", { length: 255 }),
  guardianPhone: varchar("guardian_phone", { length: 50 }),
  guardianRelation: varchar("guardian_relation", { length: 50 }), // Father, Mother, Spouse, etc.
  emergencyContact: varchar("emergency_contact", { length: 50 }),
  maritalStatus: varchar("marital_status", { length: 50 }).default("Single"),
  occupation: varchar("occupation", { length: 100 }),
  memberId: varchar("member_id", { length: 50 }),
  allergies: varchar("allergies", { length: 500 }),
  status: varchar("status", { length: 50 }).default("Active"), // 'Active', 'Admitted', 'Discharged'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 4. Appointments table (Doctor Serials & Queue)
export const appointments = pgTable("appointments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tokenNo: varchar("token_no", { length: 100 }), // e.g. SRL-20261111-001
  serialNumber: integer("serial_number"), // e.g. 1, 2, 3...
  patientId: varchar("patient_id", { length: 64 }),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientPhone: varchar("patient_phone", { length: 50 }),
  patientAge: integer("patient_age"),
  patientGender: varchar("patient_gender", { length: 20 }),
  doctorId: varchar("doctor_id", { length: 64 }),
  doctorName: varchar("doctor_name", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }),
  roomNumber: varchar("room_number", { length: 100 }),
  date: varchar("date", { length: 50 }).notNull(),
  time: varchar("time", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("Waiting"), // 'Waiting', 'In Consultation', 'Completed', 'Cancelled'
  type: varchar("type", { length: 100 }).default("First Visit"), // 'First Visit', 'Follow-up', 'Report Show', 'Emergency'
  fee: numeric("fee", { precision: 10, scale: 2 }).default("1000.00"),
  discount: numeric("discount", { precision: 10, scale: 2 }).default("0.00"),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).default("1000.00"),
  dueAmount: numeric("due_amount", { precision: 10, scale: 2 }).default("0.00"),
  paymentStatus: varchar("payment_status", { length: 50 }).default("Paid"), // 'Paid', 'Unpaid', 'Partial'
  paymentMethod: varchar("payment_method", { length: 50 }).default("Cash"),
  symptoms: text("symptoms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// 15. Rooms & Beds table (Section 4.7 Inpatient & Ward Management)
export const rooms = pgTable("rooms", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  roomNumber: varchar("room_number", { length: 100 }).notNull(),
  floor: varchar("floor", { length: 100 }).notNull(),
  roomType: varchar("room_type", { length: 100 }).default("General Ward"), // 'General Ward', 'Single Cabin', 'Deluxe Cabin', 'VIP Suite', 'ICU', 'CCU', 'NICU', 'Post-Op'
  department: varchar("department", { length: 255 }).default("Inpatient (IPD)"),
  perDayCharge: numeric("per_day_charge", { precision: 12, scale: 2 }).notNull().default("1500.00"),
  bedCount: integer("bed_count").notNull().default(1),
  occupiedBeds: integer("occupied_beds").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("Available"), // 'Available', 'Booked', 'Maintenance', 'Cleaning'
  patientName: varchar("patient_name", { length: 255 }),
  admissionId: varchar("admission_id", { length: 100 }),
  bedNumbers: jsonb("bed_numbers").default([]), // Custom bed numbers e.g. ['A1', 'B3', 'Bed 1']
  extraCharges: jsonb("extra_charges").default([]), // Dynamic custom key-values: [{ key: 'Oxygen', value: 500 }]
  amenities: jsonb("amenities").default([]), // ['Oxygen Pipeline', 'Attached Washroom', 'AC']
  notes: varchar("notes", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 16. Surgical Operations & Procedures (Section 4.8 Clinical Operations)
export const operations = pgTable("operations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).default("General Surgery"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("15000.00"),
  canDiscount: boolean("can_discount").default(true),
  maxDiscountPercent: numeric("max_discount_percent", { precision: 5, scale: 2 }).default("15.00"),
  doctorId: varchar("doctor_id", { length: 64 }),
  doctorName: varchar("doctor_name", { length: 255 }),
  roomNumber: varchar("room_number", { length: 100 }), // e.g. 'OT-01 (Major Surgical)', 'Minor OT'
  duration: varchar("duration", { length: 100 }).default("60 mins"),
  anesthesiaType: varchar("anesthesia_type", { length: 100 }).default("General Anesthesia"),
  description: varchar("description", { length: 1000 }),
  status: varchar("status", { length: 50 }).default("Active"), // 'Active', 'Inactive'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 17. Diagnostic & Pathology Tests (Section 4.9 Laboratory & Diagnostics)
export const diagnosticTests = pgTable("diagnostic_tests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  category: varchar("category", { length: 100 }).default("Pathology"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("500.00"),
  isDiscountable: boolean("is_discountable").default(true),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).default("10.00"), // discount able as percentage
  roomNumber: varchar("room_number", { length: 100 }), // Optional room number e.g. 'Lab Room 102'
  sampleType: varchar("sample_type", { length: 100 }).default("Blood"),
  deliveryTime: varchar("delivery_time", { length: 100 }).default("Same Day (4 Hours)"),
  normalRange: varchar("normal_range", { length: 500 }),
  description: varchar("description", { length: 1000 }),
  status: varchar("status", { length: 50 }).default("Active"), // 'Active', 'Inactive'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 18. Inpatient Admissions & POS Billing (Section 4.10 IPD Admission)
export const admissions = pgTable("admissions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  admissionNo: varchar("admission_no", { length: 100 }).unique().notNull(), // Unique Auto e.g. ADM-2026-0001
  patientId: varchar("patient_id", { length: 64 }).notNull(),
  patientUniqueId: varchar("patient_unique_id", { length: 64 }),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientPhone: varchar("patient_phone", { length: 50 }),
  patientAge: integer("patient_age"),
  patientGender: varchar("patient_gender", { length: 20 }),
  guardianName: varchar("guardian_name", { length: 255 }),
  guardianPhone: varchar("guardian_phone", { length: 50 }),
  guardianRelation: varchar("guardian_relation", { length: 50 }),
  admissionDate: timestamp("admission_date").defaultNow(),
  dischargeDate: timestamp("discharge_date"),
  status: varchar("status", { length: 50 }).default("Admitted"), // 'Admitted', 'Discharged', 'Under Observation'
  roomId: varchar("room_id", { length: 64 }),
  roomNumber: varchar("room_number", { length: 100 }),
  roomName: varchar("room_name", { length: 255 }),
  bedNumber: varchar("bed_number", { length: 50 }),
  perDayCharge: numeric("per_day_charge", { precision: 12, scale: 2 }).default("1500.00"),
  doctorId: varchar("doctor_id", { length: 64 }),
  doctorName: varchar("doctor_name", { length: 255 }),
  department: varchar("department", { length: 255 }),
  operationId: varchar("operation_id", { length: 64 }),
  operationName: varchar("operation_name", { length: 255 }),
  operationPrice: numeric("operation_price", { precision: 12, scale: 2 }).default("0.00"),
  extraCharges: jsonb("extra_charges").default([]), // [{ key: 'Oxygen', value: 500, unit: 'per day' }]
  admissionFee: numeric("admission_fee", { precision: 12, scale: 2 }).default("500.00"),
  roomCharge: numeric("room_charge", { precision: 12, scale: 2 }).default("0.00"),
  operationCharge: numeric("operation_charge", { precision: 12, scale: 2 }).default("0.00"),
  extraChargesTotal: numeric("extra_charges_total", { precision: 12, scale: 2 }).default("0.00"),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).default("0.00"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0.00"),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).default("0.00"),
  advancePayment: numeric("advance_payment", { precision: 12, scale: 2 }).default("0.00"),
  dueAmount: numeric("due_amount", { precision: 12, scale: 2 }).default("0.00"),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Cash"),
  paymentStatus: varchar("payment_status", { length: 50 }).default("Paid"), // 'Paid', 'Partial', 'Due'
  diagnosis: varchar("diagnosis", { length: 1000 }),
  notes: varchar("notes", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 19. Diagnostic Orders & Investigation History
export const diagnosticOrders = pgTable("diagnostic_orders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  orderNo: varchar("order_no", { length: 100 }).unique().notNull(), // e.g. LAB-2026-0001
  patientId: varchar("patient_id", { length: 64 }).notNull(),
  patientUniqueId: varchar("patient_unique_id", { length: 64 }),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientPhone: varchar("patient_phone", { length: 50 }),
  testId: varchar("test_id", { length: 64 }),
  testName: varchar("test_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  finalAmount: numeric("final_amount", { precision: 12, scale: 2 }).notNull(),
  sampleStatus: varchar("sample_status", { length: 50 }).default("Collected"), // 'Pending', 'Collected', 'Report Ready'
  deliveryDate: varchar("delivery_date", { length: 50 }),
  reportUrl: varchar("report_url", { length: 500 }),
  doctorName: varchar("doctor_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// 20. Diagnostic Invoices & POS Billing
export const diagnosticInvoices = pgTable("diagnostic_invoices", {
  id: varchar("id", { length: 64 }).primaryKey(),
  invoiceNo: varchar("invoice_no", { length: 100 }).unique().notNull(), // e.g. LAB-2026-0004
  patientId: varchar("patient_id", { length: 64 }).notNull(),
  patientUniqueId: varchar("patient_unique_id", { length: 64 }),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientPhone: varchar("patient_phone", { length: 50 }),
  patientAge: integer("patient_age"),
  patientGender: varchar("patient_gender", { length: 20 }),
  doctorId: varchar("doctor_id", { length: 64 }),
  doctorName: varchar("doctor_name", { length: 255 }),
  items: jsonb("items").notNull().default([]), // [{ testId, testName, category, price, discountPercent, discountAmount, finalAmount, deliveryDate, roomNumber, sampleType }]
  testsCount: integer("tests_count").default(1),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0.00"),
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0.00"),
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull().default("0.00"),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  dueAmount: numeric("due_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Cash"),
  paymentStatus: varchar("payment_status", { length: 50 }).default("Paid"), // 'Paid', 'Partial', 'Due'
  sampleStatus: varchar("sample_status", { length: 50 }).default("Collected"), // 'Pending', 'Collected', 'Processing', 'Report Ready'
  deliveryDate: varchar("delivery_date", { length: 100 }),
  notes: varchar("notes", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 21. Shareholders table (Ownership & Dividend Tracking - Section 4.7)
export const shareholders = pgTable("shareholders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  nid: varchar("nid", { length: 50 }),
  ownershipPercentage: numeric("ownership_percentage", { precision: 5, scale: 2 }).notNull(), // e.g. 15.00%
  investmentAmount: numeric("investment_amount", { precision: 12, scale: 2 }).default("0.00"),
  joinedDate: varchar("joined_date", { length: 50 }),
  bankAccountDetails: varchar("bank_account_details", { length: 500 }),
  status: varchar("status", { length: 50 }).default("Active"), // 'Active', 'Inactive'
  notes: varchar("notes", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 22. Shareholder Dividends & Payouts
export const shareholderPayouts = pgTable("shareholder_payouts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  shareholderId: varchar("shareholder_id", { length: 64 }).notNull(),
  shareholderName: varchar("shareholder_name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  period: varchar("period", { length: 100 }).notNull(), // e.g. 'November 2026', 'Q3 2026'
  paymentDate: varchar("payment_date", { length: 50 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).default("Bank Transfer"),
  transactionRef: varchar("transaction_ref", { length: 100 }),
  status: varchar("status", { length: 50 }).default("Paid"), // 'Paid', 'Pending'
  notes: varchar("notes", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
});



// 23. Pharmacies (independent pharmacy outlets created by hospital admins)
// `id` is a sequential numeric pharmacy code starting at 1001
export const pharmacies = pgTable("pharmacies", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity({ startWith: 1001 }),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  licenseNo: varchar("license_no", { length: 100 }).notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 64 }), // hospital admin user id
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 24. Pharmacy Users (separate auth system from hospital `users`)
// Roles: 'owner', 'manager', 'pharmacist', 'cashier', 'staff'
// Phone is unique per pharmacy, so one person can work at several pharmacies
export const pharmacyUsers = pgTable(
  "pharmacy_users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    pharmacyId: integer("pharmacy_id")
      .notNull()
      .references(() => pharmacies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }).notNull(),
    email: varchar("email", { length: 255 }),
    password: varchar("password", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("staff"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [uniqueIndex("pharmacy_users_pharmacy_phone_idx").on(table.pharmacyId, table.phone)]
);
