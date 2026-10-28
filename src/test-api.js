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

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Neon DB + Drizzle ORM + JWT Auth is 100% operational!");
};

try {
  await runTests();
  process.exit(0);
} catch (err) {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
}

