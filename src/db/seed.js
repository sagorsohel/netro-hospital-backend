import bcrypt from "bcryptjs";
import { db } from "./index.js";
import { users, doctors, medicines, patients, appointments } from "./schema.js";
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
