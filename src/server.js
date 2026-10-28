import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { db } from "./db/index.js";
import { users } from "./db/schema.js";
import { seedDatabase } from "./db/seed.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "🏥 Welcome to Netro Hospital Management API",
    version: "1.0.0",
    database: "Neon PostgreSQL with Drizzle ORM",
    auth: {
      login: "POST /api/auth/login",
      register: "POST /api/auth/register",
      me: "GET /api/auth/me",
      defaultCredentials: [
        { role: "admin", email: "admin@netro.com", password: "••••••••" },
      ],
    },
    modules: {
      health: "/api/health",
      auth: "/api/auth",
      departments: "/api/departments",
      upload: "POST /api/upload/image",
    },
  });
});

// Mount Core Routes
app.use("/api/auth", authRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/upload", uploadRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

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

export default app;
