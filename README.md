# Netro Hospital Backend API

High-performance Express.js REST API server powering **Netro Hospital Management System (HMS)** and clinical operations.

## 🚀 Tech Stack
- **Runtime:** Node.js (ES Modules `"type": "module"`)
- **Web Framework:** Express.js 4
- **Database:** Neon Serverless PostgreSQL
- **ORM:** Drizzle ORM
- **Validation:** Zod v4
- **Authentication:** JWT (`jsonwebtoken`) + bcryptjs password hashing
- **File Storage:** Multer memory storage + Cloudinary CDN stream
- **Logging & Security:** Morgan, CORS, Dotenv

---

## 📖 Complete Architecture & API Specification
For the full architectural breakdown, 14 database table schemas, controller workflows, and frontend Redux integration details, see:
👉 **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)**

---

## 🛠️ Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```bash
PORT=5001
DATABASE_URL=postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require
JWT_SECRET=netro_hospital_jwt_super_secret_key_2026_secure
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Run Development Server
```bash
npm run dev
```
The server will start at `http://localhost:5001` and automatically ping Neon PostgreSQL. If the database is empty, it runs initial seeders automatically.

---

## ⚡ Active API Modules

Both `/api/v1` and `/api` (legacy backward compatibility) are supported:

- `POST /api/v1/auth/login` — Staff & Admin JWT Authentication
- `POST /api/v1/auth/register` — Account registration
- `GET  /api/v1/auth/me` — Authenticated staff profile
- `GET  /api/v1/departments` — Hospital department directory
- `GET  /api/v1/doctors` — Clinical doctor schedules & fees
- `GET  /api/v1/staff` — Staff directory, duty rosters, payrolls & leave
- `GET  /api/v1/equipment` — Medical equipment inventory & servicing logs
- `GET  /api/v1/expenses` — Hospital expense vouchers & stats
- `POST /api/v1/upload/image` — Direct Cloudinary asset upload
- `GET  /api/v1/health` — System uptime and status healthcheck

---

## 🔑 Pre-Configured Seed Logins
- **Admin:** `admin@netro.com` / `12345678`
- **Pharmacist:** `pharmacy@netro.com` / `12345678`
- **Pharmacy owner (pharmacy system):** pharmacy ID `1001`, phone `01711000001` / `12345678` via `POST /api/v1/pharmacy-auth/login` (see BACKEND_ARCHITECTURE.md §4.8)
