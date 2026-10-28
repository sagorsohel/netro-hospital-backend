import dotenv from 'dotenv';
dotenv.config();
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function migrateAndSeed() {
  console.log('⚡ Starting Staff & Equipment Tables Migration on Neon PostgreSQL...');

  try {
    // 1. Create staff table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS staff (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        department_id VARCHAR(64),
        department VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        address VARCHAR(500),
        photo VARCHAR(500),
        documents JSONB DEFAULT '[]'::jsonb,
        joining_date VARCHAR(50),
        salary NUMERIC(12, 2) DEFAULT 25000.00,
        blood_group VARCHAR(10),
        emergency_contact VARCHAR(50),
        qualification VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`ALTER TABLE staff ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;`);
    console.log('✅ staff table ready with documents column.');

    // 2. Create duty_rosters table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS duty_rosters (
        id VARCHAR(64) PRIMARY KEY,
        staff_id VARCHAR(64) NOT NULL,
        staff_name VARCHAR(255) NOT NULL,
        staff_role VARCHAR(100),
        department VARCHAR(255) NOT NULL,
        shift VARCHAR(100) NOT NULL,
        date VARCHAR(50) NOT NULL,
        ward_or_room VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Scheduled',
        notes VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ duty_rosters table ready.');

    // 3. Create payrolls table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payrolls (
        id VARCHAR(64) PRIMARY KEY,
        staff_id VARCHAR(64) NOT NULL,
        staff_name VARCHAR(255) NOT NULL,
        month VARCHAR(50) NOT NULL,
        basic_salary NUMERIC(12, 2) NOT NULL,
        bonus NUMERIC(12, 2) DEFAULT 0.00,
        deduction NUMERIC(12, 2) DEFAULT 0.00,
        net_salary NUMERIC(12, 2) NOT NULL,
        payment_status VARCHAR(50) DEFAULT 'Paid',
        payment_date VARCHAR(50),
        payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
        remarks VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ payrolls table ready.');

    // 4. Create leave_requests table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id VARCHAR(64) PRIMARY KEY,
        staff_id VARCHAR(64) NOT NULL,
        staff_name VARCHAR(255) NOT NULL,
        leave_type VARCHAR(100) NOT NULL,
        start_date VARCHAR(50) NOT NULL,
        end_date VARCHAR(50) NOT NULL,
        total_days INTEGER NOT NULL DEFAULT 1,
        reason VARCHAR(500) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        approved_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ leave_requests table ready.');

    // 5. Create equipment table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS equipment (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        model_no VARCHAR(100),
        serial_number VARCHAR(100),
        category VARCHAR(100) NOT NULL,
        quantity INTEGER DEFAULT 1,
        room_number VARCHAR(100),
        floor VARCHAR(100),
        department VARCHAR(255) NOT NULL,
        manufacturer VARCHAR(255),
        purchase_date VARCHAR(50),
        warranty_expiry VARCHAR(50),
        status VARCHAR(50) DEFAULT 'Functional',
        last_service_date VARCHAR(50),
        next_service_date VARCHAR(50),
        service_notes VARCHAR(1000),
        technician_contact VARCHAR(100),
        photo VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ equipment table ready.');

    // 6. Create maintenance_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id VARCHAR(64) PRIMARY KEY,
        equipment_id VARCHAR(64) NOT NULL,
        equipment_name VARCHAR(255) NOT NULL,
        service_date VARCHAR(50) NOT NULL,
        serviced_by VARCHAR(255) NOT NULL,
        cost NUMERIC(12, 2) DEFAULT 0.00,
        description VARCHAR(1000) NOT NULL,
        status_after_service VARCHAR(50) DEFAULT 'Functional',
        next_scheduled_date VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ maintenance_logs table ready.');

    // Seed Staff Profiles if table empty
    const staffRes = await db.execute(sql`SELECT count(*) FROM staff;`);
    const staffCount = parseInt(staffRes?.rows?.[0]?.count || '0', 10);
    if (staffCount === 0) {
      console.log('🌱 Seeding initial staff profiles...');
      await db.execute(sql`
        INSERT INTO staff (id, name, designation, department, phone, email, address, photo, joining_date, salary, blood_group, emergency_contact, qualification, status)
        VALUES
          ('staff_001', 'Farhana Yasmin', 'Senior ICU Nurse', 'Cardiology & ICU', '+880 1711-234567', 'farhana.nurse@hospital.com', 'Dhanmondi 32, Dhaka', 'https://images.unsplash.com/photo-1594824813571-638f02636142?w=300&auto=format&fit=crop&q=80', '2023-01-15', 38000.00, 'B+', '+880 1711-000111', 'B.Sc in Nursing (DU)', 'Active'),
          ('staff_002', 'Kamrul Hasan', 'Lead OT Technician', 'General & Laparoscopic Surgery', '+880 1819-345678', 'kamrul.tech@hospital.com', 'Mirpur 10, Dhaka', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80', '2022-06-10', 34000.00, 'O+', '+880 1819-000222', 'Diploma in Medical Technology', 'Active'),
          ('staff_003', 'Tania Sultana', 'Senior Radiographer', 'Radiology & Imaging', '+880 1912-456789', 'tania.rad@hospital.com', 'Uttara Sector 7, Dhaka', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80', '2023-08-01', 42000.00, 'A+', '+880 1912-000333', 'B.Sc in Radiography & Imaging', 'Active'),
          ('staff_004', 'Md. Rafiqul Islam', 'Medical Lab Technologist', 'Pathology & Diagnostic Lab', '+880 1613-567890', 'rafiq.lab@hospital.com', 'Mohammadpur, Dhaka', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80', '2021-11-20', 32000.00, 'AB+', '+880 1613-000444', 'B.Sc in Medical Laboratory Science', 'Active'),
          ('staff_005', 'Nasrin Akter', 'Ward Supervisor', 'Pediatrics & Neonatology', '+880 1714-678901', 'nasrin.ward@hospital.com', 'Badda, Dhaka', 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&auto=format&fit=crop&q=80', '2020-03-15', 30000.00, 'O+', '+880 1714-000555', 'Diploma in Nursing Management', 'Active');
      `);
      console.log('✅ Staff seeded.');
    }

    // Seed Duty Rosters if table empty
    const rosterRes = await db.execute(sql`SELECT count(*) FROM duty_rosters;`);
    const rosterCount = parseInt(rosterRes?.rows?.[0]?.count || '0', 10);
    if (rosterCount === 0) {
      console.log('🌱 Seeding duty rosters...');
      const today = new Date().toISOString().slice(0, 10);
      await db.execute(sql`
        INSERT INTO duty_rosters (id, staff_id, staff_name, staff_role, department, shift, date, ward_or_room, status, notes)
        VALUES
          ('roster_001', 'staff_001', 'Farhana Yasmin', 'Senior ICU Nurse', 'Cardiology & ICU', 'Morning (08:00 AM - 04:00 PM)', ${today}, 'ICU Bed 1-6', 'Present', 'Special post-op monitor duty'),
          ('roster_002', 'staff_002', 'Kamrul Hasan', 'Lead OT Technician', 'General & Laparoscopic Surgery', 'Morning (08:00 AM - 04:00 PM)', ${today}, 'OT Complex Room 2', 'Present', 'Laparoscopic cholecystectomy schedule'),
          ('roster_003', 'staff_003', 'Tania Sultana', 'Senior Radiographer', 'Radiology & Imaging', 'Evening (04:00 PM - 12:00 AM)', ${today}, 'MRI & CT Scan Suite', 'Scheduled', 'Evening trauma & emergency scans'),
          ('roster_004', 'staff_004', 'Md. Rafiqul Islam', 'Medical Lab Technologist', 'Pathology & Diagnostic Lab', 'Night (12:00 AM - 08:00 AM)', ${today}, 'Emergency Pathology Lab', 'Scheduled', 'Night blood bank & routine tests');
      `);
      console.log('✅ Duty rosters seeded.');
    }

    // Seed Equipment if table empty
    const eqRes = await db.execute(sql`SELECT count(*) FROM equipment;`);
    const eqCount = parseInt(eqRes?.rows?.[0]?.count || '0', 10);
    if (eqCount === 0) {
      console.log('🌱 Seeding medical equipment inventory...');
      await db.execute(sql`
        INSERT INTO equipment (id, name, model_no, serial_number, category, quantity, room_number, floor, department, manufacturer, purchase_date, warranty_expiry, status, last_service_date, next_service_date, service_notes, technician_contact, photo)
        VALUES
          ('eq_001', 'Philips Digital X-Ray Diagnost Pro', 'Pro-700DX', 'PH-DX-2023-8841', 'Diagnostic Imaging', 1, 'Room 102', '1st Floor', 'Radiology & Imaging', 'Philips Healthcare', '2023-03-12', '2026-03-12', 'Functional', '2026-09-15', '2026-12-15', 'High-voltage tube checked and calibrated. Image detector working optimally.', '+880 1711-998877 (Philips BD)', 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&auto=format&fit=crop&q=80'),
          ('eq_002', 'GE Carestation 650 Anaesthesia Delivery System', 'CS-650-Anaesth', 'GE-CS650-9921', 'Surgical & OT', 2, 'OT Room 1 & 2', '2nd Floor', 'General & Laparoscopic Surgery', 'GE Healthcare Ltd.', '2022-09-01', '2025-09-01', 'Functional', '2026-08-20', '2026-11-20', 'Flow sensors and ventilator bellow inspection done. O2 pipeline test passed.', '+880 1819-223344 (GE Support)', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=400&auto=format&fit=crop&q=80'),
          ('eq_003', 'Hamilton-C3 Mechanical Intensive Ventilator', 'Ham-C3-ICU', 'HAM-C3-4412', 'Intensive Care (ICU)', 4, 'ICU Unit', '3rd Floor', 'Cardiology & ICU', 'Hamilton Medical AG', '2023-05-18', '2026-05-18', 'Functional', '2026-10-05', '2027-01-05', 'Expiratory valve replaced during preventive maintenance. Battery health 98%.', '+880 1912-334455 (MediTech Ltd)', 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&auto=format&fit=crop&q=80'),
          ('eq_004', 'Mindray Resona 7 Color Doppler Ultrasound', 'Resona-7-Exp', 'MR-R7-5501', 'Diagnostic Imaging', 1, 'Room 104', '1st Floor', 'Cardiology & ICU', 'Mindray Bio-Medical', '2023-11-10', '2025-11-10', 'Under Maintenance', '2026-10-18', '2026-11-02', 'Convex probe cable connector replacement underway by Mindray field engineer.', '+880 1613-445566 (Mindray Rep)', 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=400&auto=format&fit=crop&q=80'),
          ('eq_005', 'Olympus CV-190 Evis Exera III Endoscopy System', 'EVIS-CV190', 'OLY-CV190-3309', 'Surgical & OT', 1, 'Endoscopy Suite', '2nd Floor', 'Gastroenterology', 'Olympus Medical', '2021-07-25', '2024-07-25', 'Non-functional', '2026-10-01', '2026-11-05', 'Optical xenon light source power board faulty. Awaiting replacement board import.', '+880 1714-556677 (Olympus Service)', 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=400&auto=format&fit=crop&q=80');
      `);
      console.log('✅ Equipment seeded.');
    }

    // Seed Leave Requests if table empty
    const leaveRes = await db.execute(sql`SELECT count(*) FROM leave_requests;`);
    const leaveCount = parseInt(leaveRes?.rows?.[0]?.count || '0', 10);
    if (leaveCount === 0) {
      console.log('🌱 Seeding sample leave requests...');
      await db.execute(sql`
        INSERT INTO leave_requests (id, staff_id, staff_name, leave_type, start_date, end_date, total_days, reason, status, approved_by)
        VALUES
          ('leave_001', 'staff_005', 'Nasrin Akter', 'Casual Leave', '2026-11-05', '2026-11-07', 3, 'Family wedding ceremony in hometown', 'Pending', NULL),
          ('leave_002', 'staff_002', 'Kamrul Hasan', 'Sick Leave', '2026-10-20', '2026-10-22', 2, 'Severe viral fever and clinical rest prescribed', 'Approved', 'Dr. Medical Superintendent');
      `);
      console.log('✅ Leave requests seeded.');
    }

    console.log('🎉 All Staff & Equipment tables successfully created and seeded!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateAndSeed();
