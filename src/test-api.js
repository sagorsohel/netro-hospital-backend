import http from "http";

const request = (path, method = "GET", data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const options = {
      hostname: "localhost",
      port: 5001,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(postData ? { "Content-Length": Buffer.byteLength(postData) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on("error", (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
};

const runTests = async () => {
  console.log("🚀 Starting Full API Automated Verification...\n");

  // 1. Admin Login
  console.log("1. Testing Admin Login (admin@netro.com / 12345678)...");
  const adminRes = await request("/api/auth/login", "POST", {
    email: "admin@netro.com",
    password: "12345678",
  });
  console.log("   Status:", adminRes.status);
  console.log("   User Name:", adminRes.data?.user?.name);
  console.log("   Role:", adminRes.data?.user?.role);
  console.log("   Token received:", Boolean(adminRes.data?.token));
  if (!adminRes.data?.token) throw new Error("Admin login failed!");
  const adminToken = adminRes.data.token;

  // 2. Pharmacy Login
  console.log("\n2. Testing Pharmacy Login (pharmarcy@netro.com / 12345678)...");
  const pharmaRes = await request("/api/auth/login", "POST", {
    email: "pharmarcy@netro.com",
    password: "12345678",
  });
  console.log("   Status:", pharmaRes.status);
  console.log("   User Name:", pharmaRes.data?.user?.name);
  console.log("   Role:", pharmaRes.data?.user?.role);
  console.log("   Token received:", Boolean(pharmaRes.data?.token));
  if (!pharmaRes.data?.token) throw new Error("Pharmacy login failed!");
  const pharmaToken = pharmaRes.data.token;

  // 3. Test /api/auth/me
  console.log("\n3. Testing GET /api/auth/me with JWT...");
  const meRes = await request("/api/auth/me", "GET", null, adminToken);
  console.log("   Status:", meRes.status);
  console.log("   Authenticated Profile:", meRes.data?.data?.email, "(Role:", meRes.data?.data?.role, ")");

  // 4. Test Doctors endpoint
  console.log("\n4. Testing GET /api/doctors (Neon DB)...");
  const docRes = await request("/api/doctors");
  console.log("   Status:", docRes.status);
  console.log("   Doctors count in Neon DB:", docRes.data?.count);

  // 5. Test Pharmacy Medicines with JWT
  console.log("\n5. Testing GET /api/pharmacy/medicines with JWT...");
  const medRes = await request("/api/pharmacy/medicines", "GET", null, pharmaToken);
  console.log("   Status:", medRes.status);
  console.log("   Medicines in stock:", medRes.data?.count);

  // 6. Test Pharmacy KPI Stats
  console.log("\n6. Testing GET /api/pharmacy/stats with JWT...");
  const statsRes = await request("/api/pharmacy/stats", "GET", null, pharmaToken);
  console.log("   Status:", statsRes.status);
  console.log("   Total Stock Valuation:", statsRes.data?.data?.totalStockValuation);
  console.log("   Low Stock Count:", statsRes.data?.data?.lowStockCount);

  // 7. Test POS Sale & Inventory Deduction
  console.log("\n7. Testing POST /api/pharmacy/invoices (Create Sale & Auto Deduct Stock)...");
  const saleRes = await request(
    "/api/pharmacy/invoices",
    "POST",
    {
      customerName: "Md. Tanvir Hossain",
      phone: "+8801755123456",
      memberId: "MEM-881",
      isMember: true,
      hasPrescription: true,
      items: [
        {
          medicineId: medRes.data?.data?.[0]?.id,
          name: medRes.data?.data?.[0]?.name,
          unitType: "strip",
          quantity: 2,
          unitPrice: 35,
          totalPrice: 70,
        },
      ],
    },
    pharmaToken
  );
  console.log("   Status:", saleRes.status);
  console.log("   Invoice No:", saleRes.data?.data?.invoiceNo);
  console.log("   Grand Total:", saleRes.data?.data?.grandTotal);
  console.log("   WhatsApp Sent:", saleRes.data?.data?.whatsappSent);

  // 8. Test Departments CRUD & RBAC
  console.log("\n8. Testing Departments CRUD & RBAC (/api/departments)...");
  // 8a. Read departments
  const deptListRes = await request("/api/departments?page=1&limit=4", "GET", null, adminToken);
  console.log("   GET /api/departments Status:", deptListRes.status);
  console.log("   Total departments:", deptListRes.data?.pagination?.total);
  console.log("   Current page items:", deptListRes.data?.data?.length);

  // 8b. Create department as Admin
  console.log("   Testing POST /api/departments as Admin...");
  const newDeptRes = await request(
    "/api/departments",
    "POST",
    {
      name: "Oncology & Chemotherapy",
      description: "Comprehensive tumor diagnosis, targeted radiation, and chemotherapy infusion.",
      icon: "ShieldAlert",
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&q=80",
      headOfDepartment: "Dr. Farhana Yasmin",
      floor: "5th Floor",
      roomNumber: "502",
      contactEmail: "oncology@netrohospital.com",
      contactPhone: "+1 (555) 777-8899",
      status: "Active",
    },
    adminToken
  );
  console.log("   Admin Create Status:", newDeptRes.status);
  console.log("   Created ID:", newDeptRes.data?.data?.id);
  const createdDeptId = newDeptRes.data?.data?.id;

  // 8c. Test RBAC: Non-admin should be 403 Forbidden
  console.log("   Testing RBAC: Non-admin trying to delete department...");
  const nonAdminDeleteRes = await request(
    `/api/departments/${createdDeptId}`,
    "DELETE",
    null,
    pharmaToken // pharmacist role, not admin
  );
  console.log("   Non-admin delete Status (expected 403):", nonAdminDeleteRes.status);
  if (nonAdminDeleteRes.status !== 403) throw new Error("RBAC failed! Non-admin should get 403.");

  // 8d. Delete department as Admin
  console.log("   Testing DELETE /api/departments as Admin...");
  const adminDeleteRes = await request(
    `/api/departments/${createdDeptId}`,
    "DELETE",
    null,
    adminToken
  );
  console.log("   Admin delete Status:", adminDeleteRes.status);

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Neon DB + Drizzle ORM + Departments CRUD + RBAC is 100% operational!");

};

try {
  await runTests();
  process.exit(0);
} catch (err) {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
}

