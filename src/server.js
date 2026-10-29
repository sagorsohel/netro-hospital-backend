// Load environment variables before any other module reads process.env
import "dotenv/config";

import app from "./app.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { seedDatabase } from "./db/seed.js";

const PORT = process.env.PORT || 5000;

// Start Server and verify DB connection
app.listen(PORT, async () => {
  console.log(`🏥 Netro Hospital Server running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);

  try {
    const existingUsers = await db.select({ count: users.id }).from(users);
    console.log(`⚡ Connected to Neon PostgreSQL via Drizzle ORM!`);
    if (existingUsers.length === 0) {
      console.log("🌱 Database is empty. Running initial seeder...");
      await seedDatabase();
    }
  } catch (err) {
    console.warn("⚠️ Database ping warning:", err.message);
  }
});
