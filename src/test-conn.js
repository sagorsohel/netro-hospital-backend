import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import "dotenv/config";

console.log("🔍 Diagnosing Neon connection from this machine...");
console.log("Database URL configured:", process.env.DATABASE_URL ? "YES" : "NO");

const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error("❌ No DATABASE_URL in .env!");
  process.exit(1);
}

// 1. Test DNS Resolution
const hostMatch = connStr.match(/@([^:\/?#]+)/);
const host = hostMatch ? hostMatch[1] : null;
console.log("Target Host:", host);

if (host) {
  dns.lookup(host, { all: true }, (err, addresses) => {
    if (err) {
      console.error("❌ DNS lookup failed:", err);
    } else {
      console.log("✅ DNS Resolved Addresses (IPv4 first):", addresses);
    }
  });
}

// 2. Test HTTP (Port 443) via Neon HTTP
async function testHttp() {
  try {
    console.log("📡 Testing HTTP Port 443 via fetch to Neon...");
    const res = await fetch(`https://${host}/sql`, {
      method: "POST",
      headers: {
        "Neon-Connection-String": connStr,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "SELECT 1 as test_http;" }),
    });
    const json = await res.json();
    console.log("✅ HTTP (Port 443) SUCCESS! Response:", json);
  } catch (e) {
    console.error("❌ HTTP (Port 443) FAILED:", e.message, e.cause || "");
  }
}

// 3. Test TCP (Port 5432) via postgres-js
async function testTcp() {
  try {
    console.log("🔌 Testing TCP Port 5432 via postgres-js...");
    const { default: postgres } = await import("postgres");
    const sql = postgres(connStr, { ssl: "require", connect_timeout: 5 });
    const rows = await sql`SELECT 1 as test_tcp;`;
    console.log("✅ TCP (Port 5432) SUCCESS! Response:", rows);
    await sql.end();
  } catch (e) {
    console.error("❌ TCP (Port 5432) FAILED:", e.message, e.cause || "");
  }
}

setTimeout(async () => {
  await testHttp();
  await testTcp();
  process.exit(0);
}, 500);
