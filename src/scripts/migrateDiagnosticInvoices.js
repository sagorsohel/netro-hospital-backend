import dotenv from "dotenv";
dotenv.config();
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

export async function migrateDiagnosticInvoices() {
  console.log("⚡ Starting Diagnostic Invoices Migration on Neon PostgreSQL...");

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS diagnostic_invoices (
        id VARCHAR(64) PRIMARY KEY,
        invoice_no VARCHAR(100) UNIQUE NOT NULL,
        patient_id VARCHAR(64) NOT NULL,
        patient_unique_id VARCHAR(64),
        patient_name VARCHAR(255) NOT NULL,
        patient_phone VARCHAR(50),
        patient_age INTEGER,
        patient_gender VARCHAR(20),
        doctor_id VARCHAR(64),
        doctor_name VARCHAR(255),
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        tests_count INTEGER DEFAULT 1,
        subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        discount_amount NUMERIC(12, 2) DEFAULT 0.00,
        grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        due_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        payment_status VARCHAR(50) DEFAULT 'Paid',
        sample_status VARCHAR(50) DEFAULT 'Collected',
        delivery_date VARCHAR(100),
        notes VARCHAR(1000),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ diagnostic_invoices table created or verified successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    throw err;
  }
}

migrateDiagnosticInvoices()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
