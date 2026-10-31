import dotenv from "dotenv";
dotenv.config();
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";
import { patients, admissions, diagnosticOrders, doctors, rooms, operations } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function migratePatientsAndAdmissions() {
  console.log("⚡ Starting Patient Profile & Admissions Migration on Neon PostgreSQL...");

  try {
    // 1. Alter patients table to add new columns if not exist
    const patientAlterQueries = [
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_id VARCHAR(64) UNIQUE;`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS dob VARCHAR(50);`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(255);`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_phone VARCHAR(50);`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS guardian_relation VARCHAR(50);`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50);`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS marital_status VARCHAR(50) DEFAULT 'Single';`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies VARCHAR(500);`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';`,
      sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`,
    ];
    for (const q of patientAlterQueries) {
      await db.execute(q);
    }
    console.log("✅ patients table schema verified & updated.");

    // 2. Create admissions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admissions (
        id VARCHAR(64) PRIMARY KEY,
        admission_no VARCHAR(100) UNIQUE NOT NULL,
        patient_id VARCHAR(64) NOT NULL,
        patient_unique_id VARCHAR(64),
        patient_name VARCHAR(255) NOT NULL,
        patient_phone VARCHAR(50),
        patient_age INTEGER,
        patient_gender VARCHAR(20),
        guardian_name VARCHAR(255),
        guardian_phone VARCHAR(50),
        guardian_relation VARCHAR(50),
        admission_date TIMESTAMP DEFAULT NOW(),
        discharge_date TIMESTAMP,
        status VARCHAR(50) DEFAULT 'Admitted',
        room_id VARCHAR(64),
        room_number VARCHAR(100),
        room_name VARCHAR(255),
        bed_number VARCHAR(50),
        per_day_charge NUMERIC(12, 2) DEFAULT 1500.00,
        doctor_id VARCHAR(64),
        doctor_name VARCHAR(255),
        department VARCHAR(255),
        operation_id VARCHAR(64),
        operation_name VARCHAR(255),
        operation_price NUMERIC(12, 2) DEFAULT 0.00,
        extra_charges JSONB DEFAULT '[]'::jsonb,
        admission_fee NUMERIC(12, 2) DEFAULT 500.00,
        room_charge NUMERIC(12, 2) DEFAULT 0.00,
        operation_charge NUMERIC(12, 2) DEFAULT 0.00,
        extra_charges_total NUMERIC(12, 2) DEFAULT 0.00,
        subtotal NUMERIC(12, 2) DEFAULT 0.00,
        discount_amount NUMERIC(12, 2) DEFAULT 0.00,
        grand_total NUMERIC(12, 2) DEFAULT 0.00,
        advance_payment NUMERIC(12, 2) DEFAULT 0.00,
        due_amount NUMERIC(12, 2) DEFAULT 0.00,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        payment_status VARCHAR(50) DEFAULT 'Paid',
        diagnosis VARCHAR(1000),
        notes VARCHAR(1000),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ admissions table ready.");

    // 3. Create diagnostic_orders table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS diagnostic_orders (
        id VARCHAR(64) PRIMARY KEY,
        order_no VARCHAR(100) UNIQUE NOT NULL,
        patient_id VARCHAR(64) NOT NULL,
        patient_unique_id VARCHAR(64),
        patient_name VARCHAR(255) NOT NULL,
        patient_phone VARCHAR(50),
        test_id VARCHAR(64),
        test_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        price NUMERIC(12, 2) NOT NULL,
        discount_amount NUMERIC(10, 2) DEFAULT 0.00,
        final_amount NUMERIC(12, 2) NOT NULL,
        sample_status VARCHAR(50) DEFAULT 'Collected',
        delivery_date VARCHAR(50),
        report_url VARCHAR(500),
        doctor_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ diagnostic_orders table ready.");

    // 4. Update existing patients with unique patient_id if missing
    const existingPatients = await db.select().from(patients);
    for (let i = 0; i < existingPatients.length; i++) {
      const p = existingPatients[i];
      if (!p.patientId) {
        const generatedPatientId = `PAT-2026-${String(i + 1).padStart(4, "0")}`;
        await db
          .update(patients)
          .set({
            patientId: generatedPatientId,
            guardianName: p.guardianName || "Mohammad Ali (Brother)",
            guardianPhone: p.guardianPhone || "+880 1711-223344",
            guardianRelation: p.guardianRelation || "Brother",
            emergencyContact: p.emergencyContact || "+880 1819-998877",
            maritalStatus: p.maritalStatus || "Married",
            status: "Active",
          })
          .where(eq(patients.id, p.id));
      }
    }
    console.log("✅ Existing patients updated with Patient IDs.");

    // 5. Seed sample patient profiles if count is low
    if (existingPatients.length < 4) {
      const samplePatients = [
        {
          id: "pat-101",
          patientId: "PAT-2026-0003",
          name: "Shahanara Begum",
          age: 52,
          dob: "1974-05-12",
          gender: "Female",
          phone: "+880 1711-002233",
          email: "shahanara@gmail.com",
          bloodGroup: "O+",
          address: "House 14, Road 5, Dhanmondi, Dhaka",
          guardianName: "Kamrul Islam (Son)",
          guardianPhone: "+880 1711-002234",
          guardianRelation: "Son",
          emergencyContact: "+880 1711-002235",
          maritalStatus: "Married",
          occupation: "Homemaker",
          allergies: "Sulfonamides, Penicillin",
          status: "Admitted",
        },
        {
          id: "pat-102",
          patientId: "PAT-2026-0004",
          name: "Haji Abdul Gafur",
          age: 68,
          dob: "1958-11-20",
          gender: "Male",
          phone: "+880 1819-334455",
          email: "gafur.haji@gmail.com",
          bloodGroup: "A+",
          address: "Sector 7, Uttara, Dhaka",
          guardianName: "Tareq Gafur (Son)",
          guardianPhone: "+880 1819-334456",
          guardianRelation: "Son",
          emergencyContact: "+880 1819-334457",
          maritalStatus: "Married",
          occupation: "Retired Businessman",
          allergies: "None known",
          status: "Admitted",
        },
        {
          id: "pat-103",
          patientId: "PAT-2026-0005",
          name: "Farhana Yasmin",
          age: 29,
          dob: "1997-03-15",
          gender: "Female",
          phone: "+880 1912-887766",
          email: "farhana.y@gmail.com",
          bloodGroup: "B+",
          address: "Block C, Banani, Dhaka",
          guardianName: "Dr. Asif Mahmud (Husband)",
          guardianPhone: "+880 1912-887767",
          guardianRelation: "Spouse",
          emergencyContact: "+880 1912-887768",
          maritalStatus: "Married",
          occupation: "Architect",
          allergies: "Aspirin",
          status: "Active",
        },
      ];

      for (const sp of samplePatients) {
        const found = await db.select().from(patients).where(eq(patients.id, sp.id));
        if (found.length === 0) {
          await db.insert(patients).values(sp);
        }
      }
      console.log("✅ Seeded additional comprehensive patient profiles.");
    }

    // 6. Seed sample Admissions and Diagnostics history if admissions table is empty
    const currentAdmissions = await db.select().from(admissions).limit(1);
    if (currentAdmissions.length === 0) {
      // Fetch reference doctors and rooms
      const doctorList = await db.select().from(doctors).limit(3);
      const roomList = await db.select().from(rooms).limit(3);
      const opList = await db.select().from(operations).limit(2);

      const doc1 = doctorList[0] || { id: "doc-1", name: "Dr. Sarah Johnson", department: "Cardiology" };
      const doc2 = doctorList[1] || { id: "doc-2", name: "Dr. Michael Chen", department: "Neurology" };
      const room1 = roomList[0] || { id: "rm-1", roomNumber: "302", name: "VIP Suite 302", perDayCharge: "4500.00" };
      const room2 = roomList[1] || { id: "rm-2", roomNumber: "204", name: "Deluxe Cabin 204", perDayCharge: "2800.00" };
      const op1 = opList[0] || { id: "op-1", name: "Laparoscopic Cholecystectomy", price: "25000.00" };

      const sampleAdmissions = [
        {
          id: "adm-101",
          admissionNo: "ADM-2026-0001",
          patientId: "pat-101",
          patientUniqueId: "PAT-2026-0003",
          patientName: "Shahanara Begum",
          patientPhone: "+880 1711-002233",
          patientAge: 52,
          patientGender: "Female",
          guardianName: "Kamrul Islam",
          guardianPhone: "+880 1711-002234",
          guardianRelation: "Son",
          status: "Admitted",
          roomId: room1.id,
          roomNumber: room1.roomNumber,
          roomName: room1.name,
          bedNumber: "A1",
          perDayCharge: room1.perDayCharge,
          doctorId: doc1.id,
          doctorName: doc1.name,
          department: doc1.department,
          operationId: op1.id,
          operationName: op1.name,
          operationPrice: op1.price,
          extraCharges: [
            { key: "Oxygen Cylinder Support", value: 500, unit: "per day" },
            { key: "Specialist Nursing Care", value: 350, unit: "per shift" },
          ],
          admissionFee: "500.00",
          roomCharge: "4500.00",
          operationCharge: "25000.00",
          extraChargesTotal: "850.00",
          subtotal: "30850.00",
          discountAmount: "1000.00",
          grandTotal: "29850.00",
          advancePayment: "15000.00",
          dueAmount: "14850.00",
          paymentMethod: "bKash / MFS",
          paymentStatus: "Partial",
          diagnosis: "Acute symptomatic cholelithiasis with biliary colic",
          notes: "Patient admitted for laparoscopic procedure under general anesthesia. Pre-op routine done.",
        },
        {
          id: "adm-102",
          admissionNo: "ADM-2026-0002",
          patientId: "pat-102",
          patientUniqueId: "PAT-2026-0004",
          patientName: "Haji Abdul Gafur",
          patientPhone: "+880 1819-334455",
          patientAge: 68,
          patientGender: "Male",
          guardianName: "Tareq Gafur",
          guardianPhone: "+880 1819-334456",
          guardianRelation: "Son",
          status: "Admitted",
          roomId: room2.id,
          roomNumber: room2.roomNumber,
          roomName: room2.name,
          bedNumber: "Bed-1",
          perDayCharge: room2.perDayCharge,
          doctorId: doc2.id,
          doctorName: doc2.name,
          department: doc2.department,
          extraCharges: [
            { key: "Cardiac Telemetry Monitor", value: 1200, unit: "per day" },
          ],
          admissionFee: "500.00",
          roomCharge: "2800.00",
          operationCharge: "0.00",
          extraChargesTotal: "1200.00",
          subtotal: "4500.00",
          discountAmount: "0.00",
          grandTotal: "4500.00",
          advancePayment: "4500.00",
          dueAmount: "0.00",
          paymentMethod: "Cash",
          paymentStatus: "Paid",
          diagnosis: "Transient ischemic attack (TIA) observation and neurological monitoring",
          notes: "Continuous 24hr ECG telemetry and blood pressure titration.",
        },
      ];

      for (const sa of sampleAdmissions) {
        await db.insert(admissions).values(sa);
      }
      console.log("✅ Seeded sample admissions linked with rooms, beds, operations and POS bills.");

      // Also seed diagnostic orders for patient history
      const sampleDiagnostics = [
        {
          id: "diag-1",
          orderNo: "LAB-2026-0001",
          patientId: "pat-101",
          patientUniqueId: "PAT-2026-0003",
          patientName: "Shahanara Begum",
          patientPhone: "+880 1711-002233",
          testName: "Complete Blood Count (CBC)",
          category: "Hematology",
          price: "450.00",
          discountAmount: "45.00",
          finalAmount: "405.00",
          sampleStatus: "Report Ready",
          deliveryDate: "2026-10-28",
          doctorName: "Dr. Sarah Johnson",
        },
        {
          id: "diag-2",
          orderNo: "LAB-2026-0002",
          patientId: "pat-101",
          patientUniqueId: "PAT-2026-0003",
          patientName: "Shahanara Begum",
          patientPhone: "+880 1711-002233",
          testName: "Ultrasonography of Whole Abdomen (USG)",
          category: "Radiology & Imaging",
          price: "1800.00",
          discountAmount: "0.00",
          finalAmount: "1800.00",
          sampleStatus: "Report Ready",
          deliveryDate: "2026-10-29",
          doctorName: "Dr. Sarah Johnson",
        },
        {
          id: "diag-3",
          orderNo: "LAB-2026-0003",
          patientId: "pat-102",
          patientUniqueId: "PAT-2026-0004",
          patientName: "Haji Abdul Gafur",
          patientPhone: "+880 1819-334455",
          testName: "MRI Brain with Contrast",
          category: "Radiology & Imaging",
          price: "8500.00",
          discountAmount: "500.00",
          finalAmount: "8000.00",
          sampleStatus: "Report Ready",
          deliveryDate: "2026-10-30",
          doctorName: "Dr. Michael Chen",
        },
      ];

      for (const sd of sampleDiagnostics) {
        await db.insert(diagnosticOrders).values(sd);
      }
      console.log("✅ Seeded diagnostic history for patients.");
    }

    console.log("🎉 Patients & Admissions migration finished successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    throw err;
  }
}

// Run directly
migratePatientsAndAdmissions()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
