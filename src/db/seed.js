import bcrypt from "bcryptjs";
import { db } from "./index.js";
import { users, doctors, medicines, patients, appointments, departments } from "./schema.js";
import { eq } from "drizzle-orm";


export const seedDatabase = async () => {
  console.log("🌱 Starting Database Seeding...");

  // 1. Password hashing
  const defaultPassword = await bcrypt.hash("12345678", 10);

  // 2. Seed Users
  const seedUsers = [
    {
      id: "usr-admin-1",
      name: "Dr. Sohel Sagor (Hospital Director)",
      email: "admin@netro.com",
      password: defaultPassword,
      role: "admin",
      branchName: "Netro Central Hospital",
      phone: "+8801700000001",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
      isActive: true,
    },
    {
      id: "usr-pharma-1",
      name: "Chief Pharmacist",
      email: "pharmarcy@netro.com", // Exact spelling specified by user
      password: defaultPassword,
      role: "pharmacist",
      branchName: "Main Hospital Pharmacy (Branch #1)",
      phone: "+8801700000002",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80",
      isActive: true,
    },
    {
      id: "usr-pharma-2",
      name: "Chief Pharmacist (Standard)",
      email: "pharmacy@netro.com", // Standard spelling alias for developer convenience
      password: defaultPassword,
      role: "pharmacist",
      branchName: "Main Hospital Pharmacy (Branch #1)",
      phone: "+8801700000003",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80",
      isActive: true,
    },
  ];

  for (const u of seedUsers) {
    const existing = await db.select().from(users).where(eq(users.email, u.email));
    if (existing.length === 0) {
      await db.insert(users).values(u);
      console.log(`✅ Seeded user: ${u.email} (${u.role})`);
    } else {
      // Update password and info to match required credentials
      await db
        .update(users)
        .set({ password: defaultPassword, role: u.role, name: u.name, branchName: u.branchName })
        .where(eq(users.email, u.email));
      console.log(`🔄 Updated user credentials for: ${u.email}`);
    }
  }

  // 3. Seed Doctors
  const seedDoctors = [
    {
      id: "doc-1",
      name: "Dr. Sarah Johnson",
      specialty: "Cardiology",
      experience: "12 years",
      rating: "4.90",
      availability: "Available Today",
      phone: "+1 (555) 234-5678",
      email: "sarah.johnson@netrohospital.com",
      department: "Cardiology",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&q=80",
    },
    {
      id: "doc-2",
      name: "Dr. Michael Chen",
      specialty: "Neurology",
      experience: "15 years",
      rating: "4.80",
      availability: "Available Tomorrow",
      phone: "+1 (555) 345-6789",
      email: "michael.chen@netrohospital.com",
      department: "Neurology",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&q=80",
    },
    {
      id: "doc-3",
      name: "Dr. Emily Taylor",
      specialty: "Pediatrics",
      experience: "8 years",
      rating: "4.95",
      availability: "Available Today",
      phone: "+1 (555) 456-7890",
      email: "emily.taylor@netrohospital.com",
      department: "Pediatrics",
      image: "https://images.unsplash.com/photo-1594824813575-d227b94b05a7?w=300&q=80",
    },
    {
      id: "doc-4",
      name: "Dr. James Wilson",
      specialty: "Orthopedics",
      experience: "10 years",
      rating: "4.70",
      availability: "Next Mon",
      phone: "+1 (555) 567-8901",
      email: "james.wilson@netrohospital.com",
      department: "Orthopedics",
      image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&q=80",
    },
  ];

  for (const doc of seedDoctors) {
    const existing = await db.select().from(doctors).where(eq(doctors.id, doc.id));
    if (existing.length === 0) {
      await db.insert(doctors).values(doc);
    }
  }
  console.log(`✅ Seeded ${seedDoctors.length} doctors`);

  // 4. Seed Medicines
  const seedMedicines = [
    {
      id: "med-1",
      name: "Napa Extra 500mg",
      generic: "Paracetamol + Caffeine",
      category: "Analgesic",
      cartonQty: 45,
      packetPerCarton: 20,
      piecePerPacket: 10,
      totalPieces: 9000,
      unitSellingPrice: "3.50",
      stripSellingPrice: "35.00",
      batchNo: "BATCH-8921",
      expiryDate: "2027-08-15",
      minThresholdPieces: 1000,
      supplier: "Beximco Pharmaceuticals",
      branch: "Main Hospital Pharmacy",
    },
    {
      id: "med-2",
      name: "Seclo 20mg Capsule",
      generic: "Omeprazole",
      category: "Gastroenterology",
      cartonQty: 25,
      packetPerCarton: 15,
      piecePerPacket: 10,
      totalPieces: 3750,
      unitSellingPrice: "6.00",
      stripSellingPrice: "60.00",
      batchNo: "BATCH-4410",
      expiryDate: "2026-11-20",
      minThresholdPieces: 500,
      supplier: "Square Pharmaceuticals",
      branch: "Main Hospital Pharmacy",
    },
    {
      id: "med-3",
      name: "Ciprocin 500mg",
      generic: "Ciprofloxacin",
      category: "Antibiotic",
      cartonQty: 3,
      packetPerCarton: 10,
      piecePerPacket: 10,
      totalPieces: 300,
      unitSellingPrice: "15.00",
      stripSellingPrice: "150.00",
      batchNo: "BATCH-1192",
      expiryDate: "2026-11-05",
      minThresholdPieces: 500,
      supplier: "Square Pharmaceuticals",
      branch: "Main Hospital Pharmacy",
    },
    {
      id: "med-4",
      name: "Monas 10mg",
      generic: "Montelukast",
      category: "Respiratory",
      cartonQty: 2,
      packetPerCarton: 10,
      piecePerPacket: 10,
      totalPieces: 200,
      unitSellingPrice: "16.00",
      stripSellingPrice: "160.00",
      batchNo: "BATCH-9032",
      expiryDate: "2028-01-10",
      minThresholdPieces: 400,
      supplier: "Incepta Pharmaceuticals",
      branch: "Main Hospital Pharmacy",
    },
  ];

  for (const med of seedMedicines) {
    const existing = await db.select().from(medicines).where(eq(medicines.id, med.id));
    if (existing.length === 0) {
      await db.insert(medicines).values(med);
    }
  }
  console.log(`✅ Seeded ${seedMedicines.length} medicines`);

  // 5. Seed Patients
  const seedPatients = [
    {
      id: "pat-1",
      name: "Rahim Uddin",
      age: 45,
      gender: "Male",
      phone: "+8801712345678",
      email: "rahim@example.com",
      bloodGroup: "B+",
      address: "Dhanmondi, Dhaka",
      memberId: "MEM-881",
    },
    {
      id: "pat-2",
      name: "Nasreen Akter",
      age: 32,
      gender: "Female",
      phone: "+8801812345679",
      email: "nasreen@example.com",
      bloodGroup: "O+",
      address: "Mirpur-10, Dhaka",
      memberId: "MEM-402",
    },
  ];

  for (const pat of seedPatients) {
    const existing = await db.select().from(patients).where(eq(patients.id, pat.id));
    if (existing.length === 0) {
      await db.insert(patients).values(pat);
    }
  }
  console.log(`✅ Seeded ${seedPatients.length} patients`);

  // 6. Seed Departments
  const seedDepartments = [
    {
      id: "dept-1",
      name: "Cardiology",
      slug: "cardiology",
      description: "Comprehensive cardiovascular diagnostics, interventional catheterization, ECG, and echocardiography.",
      icon: "HeartPulse",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&q=80",
      headOfDepartment: "Dr. Sarah Johnson",
      floor: "3rd Floor",
      roomNumber: "301",
      contactEmail: "cardio@netrohospital.com",
      contactPhone: "+1 (555) 234-5678",
      doctorsCount: 8,
      status: "Active",
    },
    {
      id: "dept-2",
      name: "Neurology & Neurosurgery",
      slug: "neurology",
      description: "Advanced neurological diagnostics, stroke unit, EEG, and peripheral nerve treatment.",
      icon: "Brain",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&q=80",
      headOfDepartment: "Dr. Michael Chen",
      floor: "4th Floor",
      roomNumber: "405",
      contactEmail: "neuro@netrohospital.com",
      contactPhone: "+1 (555) 345-6789",
      doctorsCount: 6,
      status: "Active",
    },
    {
      id: "dept-3",
      name: "Pediatrics & Neonatal Care",
      slug: "pediatrics",
      description: "Child wellness clinics, pediatric intensive care (NICU), immunizations, and developmental health.",
      icon: "Baby",
      image: "https://images.unsplash.com/photo-1594824813575-d227b94b05a7?w=500&q=80",
      headOfDepartment: "Dr. Emily Taylor",
      floor: "2nd Floor",
      roomNumber: "202",
      contactEmail: "pediatrics@netrohospital.com",
      contactPhone: "+1 (555) 456-7890",
      doctorsCount: 10,
      status: "Active",
    },
    {
      id: "dept-4",
      name: "Orthopedics & Joint Surgery",
      slug: "orthopedics",
      description: "Bone trauma, total hip & knee replacements, sports arthroscopy, and spine stabilization.",
      icon: "Bone",
      image: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&q=80",
      headOfDepartment: "Dr. James Wilson",
      floor: "1st Floor",
      roomNumber: "108",
      contactEmail: "ortho@netrohospital.com",
      contactPhone: "+1 (555) 567-8901",
      doctorsCount: 7,
      status: "Active",
    },
    {
      id: "dept-5",
      name: "Dermatology & Cosmetology",
      slug: "dermatology",
      description: "Clinical skin therapy, laser cosmetology, allergy scratch tests, and surgical excision.",
      icon: "Sparkles",
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&q=80",
      headOfDepartment: "Dr. Ayesha Rahman",
      floor: "2nd Floor",
      roomNumber: "215",
      contactEmail: "derma@netrohospital.com",
      contactPhone: "+1 (555) 678-9012",
      doctorsCount: 4,
      status: "Active",
    },
    {
      id: "dept-6",
      name: "Diagnostic & Radiology",
      slug: "radiology",
      description: "High-field 3T MRI, 128-slice CT scan, digital X-Ray, color Doppler, and bone densitometry.",
      icon: "Scan",
      image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&q=80",
      headOfDepartment: "Dr. Tanvir Alam",
      floor: "Ground Floor",
      roomNumber: "G-12",
      contactEmail: "radiology@netrohospital.com",
      contactPhone: "+1 (555) 789-0123",
      doctorsCount: 9,
      status: "Active",
    },
    {
      id: "dept-7",
      name: "Emergency & Trauma Care",
      slug: "emergency-care",
      description: "24/7 immediate trauma triage, acute resuscitation, multi-bed critical ICU, and ambulance dispatch.",
      icon: "Ambulance",
      image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=500&q=80",
      headOfDepartment: "Dr. Robert Miller",
      floor: "Ground Floor",
      roomNumber: "ER-01",
      contactEmail: "emergency@netrohospital.com",
      contactPhone: "+1 (555) 999-0000",
      doctorsCount: 14,
      status: "Active",
    },
    {
      id: "dept-8",
      name: "Gynecology & Obstetrics",
      slug: "gynecology",
      description: "Women reproductive health, maternity delivery suites, fetal medicine, and laparoscopic surgery.",
      icon: "HeartHandshake",
      image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500&q=80",
      headOfDepartment: "Dr. Samira Khan",
      floor: "3rd Floor",
      roomNumber: "310",
      contactEmail: "gynae@netrohospital.com",
      contactPhone: "+1 (555) 890-1234",
      doctorsCount: 8,
      status: "Active",
    },
  ];

  for (const dept of seedDepartments) {
    const existing = await db.select().from(departments).where(eq(departments.id, dept.id));
    if (existing.length === 0) {
      await db.insert(departments).values(dept);
    }
  }
  console.log(`✅ Seeded ${seedDepartments.length} departments`);

  console.log("🎉 Database Seeding Completed Successfully!");
};


// If run directly via node
if (process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    });
}
