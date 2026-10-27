import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import healthRoutes from "./routes/health.routes.js";
import doctorRoutes from "./routes/doctor.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Netro Hospital Management & App API",
    version: "1.0.0",
    docs: {
      health: "/api/health",
      doctors: "/api/doctors",
      patients: "/api/patients",
      appointments: "/api/appointments"
    }
  });
});

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🏥 Netro Hospital Server running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
});

export default app;
