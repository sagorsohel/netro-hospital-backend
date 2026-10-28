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
  specialty: varchar("specialty", { length: 255 }).notNull(),
  experience: varchar("experience", { length: 100 }),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("4.8"),
  availability: varchar("availability", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  department: varchar("department", { length: 255 }),
  image: varchar("image", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
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
