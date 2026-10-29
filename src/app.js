import express from "express";
import cors from "cors";
import morgan from "morgan";

import v1Routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

export const API_V1 = "/api/v1";

const app = express();

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
    apiBaseUrl: API_V1,
    database: "Neon PostgreSQL with Drizzle ORM",
    auth: {
      login: `POST ${API_V1}/auth/login`,
      register: `POST ${API_V1}/auth/register`,
      me: `GET ${API_V1}/auth/me`,
      defaultCredentials: [
        { role: "admin", email: "admin@netro.com", password: "••••••••" },
      ],
    },
    modules: {
      health: `${API_V1}/health`,
      auth: `${API_V1}/auth`,
      departments: `${API_V1}/departments`,
      doctors: `${API_V1}/doctors`,
      expenses: `${API_V1}/expenses`,
      staff: `${API_V1}/staff`,
      equipment: `${API_V1}/equipment`,
      upload: `POST ${API_V1}/upload/image`,
    },
  });
});

// Versioned API
app.use(API_V1, v1Routes);

// Legacy unversioned alias — keeps existing clients working; remove once they use /api/v1
app.use("/api", (req, res, next) => {
  res.setHeader("Deprecation", "true");
  res.setHeader("Link", `<${API_V1}${req.url}>; rel="successor-version"`);
  next();
}, v1Routes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

export default app;
