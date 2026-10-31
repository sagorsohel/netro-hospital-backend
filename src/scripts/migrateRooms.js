import dotenv from "dotenv";
dotenv.config();
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { rooms } from "../db/schema.js";

export async function migrateRooms() {
  console.log("⚡ Starting Rooms & Beds Table Migration on Neon PostgreSQL...");

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        room_number VARCHAR(100) NOT NULL,
        floor VARCHAR(100) NOT NULL,
        room_type VARCHAR(100) DEFAULT 'General Ward',
        department VARCHAR(255) DEFAULT 'Inpatient (IPD)',
        per_day_charge NUMERIC(12, 2) DEFAULT 1500.00 NOT NULL,
        bed_count INTEGER DEFAULT 1 NOT NULL,
        occupied_beds INTEGER DEFAULT 0 NOT NULL,
        status VARCHAR(50) DEFAULT 'Available' NOT NULL,
        patient_name VARCHAR(255),
        admission_id VARCHAR(100),
        extra_charges JSONB DEFAULT '[]'::jsonb,
        amenities JSONB DEFAULT '[]'::jsonb,
        notes VARCHAR(1000),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS bed_numbers JSONB DEFAULT '[]'::jsonb;
    `);

    console.log("✅ rooms table successfully created with bed_numbers column on Neon PostgreSQL.");

    // Check if rooms already have records
    const existing = await db.select({ count: sql`count(*)` }).from(rooms);
    const count = Number(existing[0]?.count || 0);

    if (count === 0) {
      console.log("🌱 Seeding initial Hospital Rooms & Beds...");

      const sampleRooms = [
        {
          id: "rm_101",
          name: "Executive VIP Suite 401",
          roomNumber: "401",
          floor: "4th Floor (VIP Wing)",
          roomType: "VIP Suite",
          department: "Inpatient (IPD)",
          perDayCharge: "6500.00",
          bedCount: 1,
          occupiedBeds: 1,
          status: "Booked",
          patientName: "Haji Abdul Gafur",
          admissionId: "IPD-2026-089",
          extraCharges: [
            { key: "Oxygen Cylinder Support", value: 500, unit: "per day" },
            { key: "Specialist Nursing Care", value: 400, unit: "per shift" },
            { key: "Attendant Bed & Linen", value: 350, unit: "one time" },
            { key: "AC & Continuous Power", value: 200, unit: "per day" },
          ],
          amenities: [
            "Oxygen Pipeline",
            "Cardiac Monitor",
            "Air Conditioned",
            "Attached Washroom",
            "Nurse Call Bell",
            "Smart LED TV",
            "Refrigerator",
            "Sofa Bed for Attendant",
          ],
          notes: "Patient admitted under Dr. Michael Chen (Neurology). High observation required.",
        },
        {
          id: "rm_102",
          name: "Deluxe Single Cabin 302",
          roomNumber: "302",
          floor: "3rd Floor",
          roomType: "Deluxe Cabin",
          department: "Surgery",
          perDayCharge: "3500.00",
          bedCount: 1,
          occupiedBeds: 0,
          status: "Available",
          patientName: null,
          admissionId: null,
          extraCharges: [
            { key: "Central Oxygen Line", value: 450, unit: "per day" },
            { key: "Ward Sanitization", value: 150, unit: "per day" },
          ],
          amenities: [
            "Oxygen Pipeline",
            "Air Conditioned",
            "Attached Washroom",
            "Nurse Call Bell",
            "Sofa Bed for Attendant",
          ],
          notes: "Fully sanitized and ready for immediate surgical admission.",
        },
        {
          id: "rm_103",
          name: "General Male Ward 102 (Unit A)",
          roomNumber: "102-A",
          floor: "1st Floor",
          roomType: "General Ward",
          department: "Inpatient (IPD)",
          perDayCharge: "800.00",
          bedCount: 6,
          occupiedBeds: 4,
          status: "Booked",
          patientName: "4 Patients Admitted",
          admissionId: "WARD-M102",
          extraCharges: [
            { key: "Duty Doctor Round Charge", value: 200, unit: "per day" },
            { key: "Basic Nursing Assistance", value: 150, unit: "per day" },
          ],
          amenities: [
            "Oxygen Pipeline",
            "Nurse Call Bell",
            "Ceiling Fans",
            "Curtain Partitions",
          ],
          notes: "Beds #1, #2, #4, #5 occupied. Beds #3 and #6 available.",
        },
        {
          id: "rm_104",
          name: "Intensive Care Unit (ICU Bed #03)",
          roomNumber: "ICU-03",
          floor: "2nd Floor (Critical Care)",
          roomType: "ICU (Intensive Care)",
          department: "Cardiology",
          perDayCharge: "12000.00",
          bedCount: 1,
          occupiedBeds: 1,
          status: "Booked",
          patientName: "Mrs. Shahanara Begum",
          admissionId: "ICU-2026-031",
          extraCharges: [
            { key: "Ventilator Support", value: 3500, unit: "per day" },
            { key: "Continuous Arterial Line Monitor", value: 1500, unit: "per day" },
            { key: "1:1 Critical Care ICU Nurse", value: 1200, unit: "per shift" },
            { key: "Syringe Infusion Pumps", value: 600, unit: "per day" },
          ],
          amenities: [
            "Ventilator Compatible",
            "Defibrillator",
            "Multi-Parameter Monitor",
            "Central Suction & Oxygen",
            "Emergency Resuscitation Cart",
          ],
          notes: "Post-cardiac arrest patient under Dr. Sarah Johnson. Strict sterile protocol.",
        },
        {
          id: "rm_105",
          name: "Single Standard Cabin 205",
          roomNumber: "205",
          floor: "2nd Floor",
          roomType: "Single Cabin",
          department: "Maternity",
          perDayCharge: "2500.00",
          bedCount: 1,
          occupiedBeds: 0,
          status: "Cleaning",
          patientName: null,
          admissionId: null,
          extraCharges: [
            { key: "Neonatal Radiant Warmer Ready", value: 500, unit: "optional" },
            { key: "Room UV Sterilization", value: 200, unit: "one time" },
          ],
          amenities: [
            "Attached Washroom",
            "Nurse Call Bell",
            "Air Conditioned",
            "Attendant Chair",
          ],
          notes: "Patient discharged this morning. Housekeeping currently disinfecting.",
        },
        {
          id: "rm_106",
          name: "Coronary Care Unit (CCU Bed #02)",
          roomNumber: "CCU-02",
          floor: "2nd Floor (Critical Care)",
          roomType: "CCU (Coronary Care)",
          department: "Cardiology",
          perDayCharge: "9500.00",
          bedCount: 1,
          occupiedBeds: 0,
          status: "Available",
          patientName: null,
          admissionId: null,
          extraCharges: [
            { key: "Cardiac Telemetry Monitor", value: 1200, unit: "per day" },
            { key: "Oxygen Flow Meter", value: 400, unit: "per day" },
          ],
          amenities: [
            "Central ECG Telemetry",
            "Cardiac Emergency Pacing",
            "Oxygen & Suction Port",
          ],
          notes: "Calibrated and ready for cardiology admissions.",
        },
      ];

      for (const room of sampleRooms) {
        await db.insert(rooms).values(room);
      }
      console.log(`✅ Seeded ${sampleRooms.length} sample hospital rooms & beds.`);
    }
  } catch (err) {
    console.error("❌ Error migrating rooms table:", err);
  }
}

// Execute directly if run as a script
if (process.argv[1]?.includes("migrateRooms.js")) {
  migrateRooms().then(() => {
    console.log("Migration complete. Exiting...");
    process.exit(0);
  });
}
