import dotenv from "dotenv";
dotenv.config();
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { operations, diagnosticTests, doctors } from "../db/schema.js";

export async function migrateOperationsAndTests() {
  console.log("⚡ Starting Operations & Tests Migration on Neon PostgreSQL...");

  try {
    // 1. Create operations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS operations (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'General Surgery',
        price NUMERIC(12, 2) DEFAULT 15000.00 NOT NULL,
        can_discount BOOLEAN DEFAULT true,
        max_discount_percent NUMERIC(5, 2) DEFAULT 15.00,
        doctor_id VARCHAR(64),
        doctor_name VARCHAR(255),
        room_number VARCHAR(100),
        duration VARCHAR(100) DEFAULT '60 mins',
        anesthesia_type VARCHAR(100) DEFAULT 'General Anesthesia',
        description VARCHAR(1000),
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ operations table ready.");

    // 2. Create diagnostic_tests table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS diagnostic_tests (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50),
        category VARCHAR(100) DEFAULT 'Pathology',
        price NUMERIC(12, 2) DEFAULT 500.00 NOT NULL,
        is_discountable BOOLEAN DEFAULT true,
        discount_percent NUMERIC(5, 2) DEFAULT 10.00,
        room_number VARCHAR(100),
        sample_type VARCHAR(100) DEFAULT 'Blood',
        delivery_time VARCHAR(100) DEFAULT 'Same Day (4 Hours)',
        normal_range VARCHAR(500),
        description VARCHAR(1000),
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ diagnostic_tests table ready.");

    // Check doctors to link with sample operations
    const doctorList = await db.select().from(doctors).limit(5);
    const doc1 = doctorList[0] || { id: "doc-1", name: "Dr. Sarah Johnson" };
    const doc2 = doctorList[1] || { id: "doc-2", name: "Dr. Michael Chen" };

    // 3. Seed sample operations if empty
    const opCount = await db.select({ count: sql`count(*)` }).from(operations);
    if (Number(opCount[0]?.count || 0) === 0) {
      console.log("🌱 Seeding sample surgical operations...");
      const sampleOps = [
        {
          id: "op_01",
          name: "Cesarean Section (C-Section)",
          category: "Gynecology & Obstetrics",
          price: "35000.00",
          canDiscount: true,
          maxDiscountPercent: "15.00",
          doctorId: doc1.id,
          doctorName: doc1.name,
          roomNumber: "OT-02 (Maternity)",
          duration: "45 mins",
          anesthesiaType: "Spinal Anesthesia",
          description: "Elective or emergency lower segment cesarean delivery including post-op care.",
          status: "Active",
        },
        {
          id: "op_02",
          name: "Laparoscopic Cholecystectomy (Gallbladder)",
          category: "General Surgery",
          price: "42000.00",
          canDiscount: true,
          maxDiscountPercent: "10.00",
          doctorId: doc2.id,
          doctorName: doc2.name,
          roomNumber: "OT-01 (Major Surgical)",
          duration: "75 mins",
          anesthesiaType: "General Anesthesia",
          description: "Minimally invasive keyhole surgery for symptomatic gallstones and cholecystitis.",
          status: "Active",
        },
        {
          id: "op_03",
          name: "Coronary Angioplasty with Stent (PTCA)",
          category: "Cardiology",
          price: "85000.00",
          canDiscount: false,
          maxDiscountPercent: "0.00",
          doctorId: doc1.id,
          doctorName: doc1.name,
          roomNumber: "Cath Lab (OT-03)",
          duration: "90 mins",
          anesthesiaType: "Local Anesthesia with Sedation",
          description: "Percutaneous coronary intervention with drug-eluting stent placement.",
          status: "Active",
        },
        {
          id: "op_04",
          name: "Open Appendectomy",
          category: "General Surgery",
          price: "22000.00",
          canDiscount: true,
          maxDiscountPercent: "20.00",
          doctorId: doc2.id,
          doctorName: doc2.name,
          roomNumber: "OT-01 (Major Surgical)",
          duration: "45 mins",
          anesthesiaType: "General Anesthesia",
          description: "Emergency surgical removal of inflamed or infected appendix.",
          status: "Active",
        },
        {
          id: "op_05",
          name: "Phaco Cataract Surgery with Foldable IOL",
          category: "Ophthalmology",
          price: "18000.00",
          canDiscount: true,
          maxDiscountPercent: "10.00",
          doctorId: doc1.id,
          doctorName: doc1.name,
          roomNumber: "Minor OT (Eye Wing)",
          duration: "25 mins",
          anesthesiaType: "Topical / Local Anesthesia",
          description: "Micro-incision ultrasonic phacoemulsification with imported premium lens.",
          status: "Active",
        },
      ];

      for (const op of sampleOps) {
        await db.insert(operations).values(op);
      }
      console.log(`✅ Seeded ${sampleOps.length} surgical operations.`);
    }

    // 4. Seed sample diagnostic tests if empty
    const testCount = await db.select({ count: sql`count(*)` }).from(diagnosticTests);
    if (Number(testCount[0]?.count || 0) === 0) {
      console.log("🌱 Seeding sample diagnostic & pathology tests...");
      const sampleTests = [
        {
          id: "test_01",
          name: "Complete Blood Count (CBC with ESR)",
          code: "CBC-01",
          category: "Hematology",
          price: "500.00",
          isDiscountable: true,
          discountPercent: "15.00",
          roomNumber: "Lab Room 102",
          sampleType: "Blood (EDTA)",
          deliveryTime: "Same Day (2 Hours)",
          normalRange: "Hb: 12-16 g/dL, WBC: 4,000-11,000 /cu mm, Platelets: 150,000-450,000",
          description: "Comprehensive 24-parameter automated cell counter analysis.",
          status: "Active",
        },
        {
          id: "test_02",
          name: "Lipid Profile (Cholesterol, Triglycerides, HDL, LDL)",
          code: "LIPID-02",
          category: "Biochemistry",
          price: "1200.00",
          isDiscountable: true,
          discountPercent: "10.00",
          roomNumber: "Lab Room 102",
          sampleType: "Blood (Fasting Serum)",
          deliveryTime: "Same Day (4 Hours)",
          normalRange: "Total Chol: <200 mg/dL, TG: <150 mg/dL, HDL: >40 mg/dL, LDL: <100 mg/dL",
          description: "12-hour fasting lipid panel for cardiovascular risk assessment.",
          status: "Active",
        },
        {
          id: "test_03",
          name: "Digital Chest X-Ray (P/A View)",
          code: "XRAY-03",
          category: "Radiology & Imaging",
          price: "700.00",
          isDiscountable: true,
          discountPercent: "10.00",
          roomNumber: "Radiology Room 04",
          sampleType: "Imaging Scan",
          deliveryTime: "Instant (30 Mins)",
          normalRange: "Both lung fields clear. Cardiac contour and cardiothoracic ratio normal.",
          description: "High-frequency digital radiography with automated report dispatch.",
          status: "Active",
        },
        {
          id: "test_04",
          name: "Ultrasound Whole Abdomen with PVR (USG)",
          code: "USG-04",
          category: "Radiology & Imaging",
          price: "1800.00",
          isDiscountable: false,
          discountPercent: "0.00",
          roomNumber: "USG Room 02",
          sampleType: "Imaging Scan",
          deliveryTime: "Instant / Same Day",
          normalRange: "Liver, gallbladder, spleen, pancreas and bilateral kidneys appear normal.",
          description: "Color Doppler 4D sonography by consultant radiologist.",
          status: "Active",
        },
        {
          id: "test_05",
          name: "Serum Creatinine with eGFR",
          code: "CREAT-05",
          category: "Biochemistry",
          price: "400.00",
          isDiscountable: true,
          discountPercent: "20.00",
          roomNumber: "Lab Room 102",
          sampleType: "Blood (Serum)",
          deliveryTime: "Same Day (2 Hours)",
          normalRange: "Male: 0.7-1.3 mg/dL, Female: 0.6-1.1 mg/dL",
          description: "Renal kidney function marker.",
          status: "Active",
        },
        {
          id: "test_06",
          name: "2D Echocardiogram with Color Doppler (2D Echo)",
          code: "ECHO-06",
          category: "Cardiology Lab",
          price: "3000.00",
          isDiscountable: true,
          discountPercent: "10.00",
          roomNumber: "Echo Room 106",
          sampleType: "Imaging Scan",
          deliveryTime: "Same Day",
          normalRange: "LVEF: 55-65%, Good LV systolic and diastolic functions.",
          description: "Non-invasive transthoracic cardiac ultrasound by cardiologist.",
          status: "Active",
        },
      ];

      for (const t of sampleTests) {
        await db.insert(diagnosticTests).values(t);
      }
      console.log(`✅ Seeded ${sampleTests.length} diagnostic tests.`);
    }
  } catch (err) {
    console.error("❌ Migration error:", err);
  }
}

if (process.argv[1]?.includes("migrateOperationsAndTests.js")) {
  migrateOperationsAndTests().then(() => {
    console.log("Migration complete. Exiting...");
    process.exit(0);
  });
}
