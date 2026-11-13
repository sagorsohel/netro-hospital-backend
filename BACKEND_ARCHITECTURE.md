# Netro Hospital Management System — Backend Architecture & Client Integration Specification

> **Comprehensive System Manual & Reference Guide**  
> **Repository:** `netro-backend`  
> **Paired Client:** `netro-management-system`  
> **Database:** Neon Serverless PostgreSQL with Drizzle ORM  
> **Architecture Pattern:** Clean Layered Express.js (Router -> Middleware -> Validator -> Controller -> ORM/DB)

---

## 1. High-Level Architectural Overview

`netro-backend` is an enterprise-grade RESTful API built on Node.js (ES Modules) and Express.js. It manages the complete digital healthcare operations of Netro Hospital, including:
- **Authentication & Role-Based Access Control (RBAC)** (Admin, Pharmacist, Doctor, Staff, Manager)
- **Department Management** with Cloudinary image assets
- **Doctor Roster & Consultation Schedules**
- **Staff, HR & Clinical Operations** (Staff Directory, Duty Rosters, Payrolls, Leave Requests)
- **Hospital Equipment & Biomedical Maintenance Tracking**
- **Financial Expense & Voucher Management** with attached bill receipts
- **Multi-Cloud File Upload System** (Cloudinary memory buffer stream)

```
[ Frontend Client: netro-management-system ]
           │ (Vite + React 19 + Redux Toolkit Query)
           ▼ (HTTP Bearer JWT Token)
┌────────────────────────────────────────────────────────┐
│ Express.js API Pipeline                                │
│                                                        │
│  1. CORS, JSON Body Parser, Morgan Logger              │
│  2. Dual Route Mounts (/api/v1 and legacy /api)        │
│  3. verifyToken (JWT decoding & Neon active-user check)│
│  4. requireRoles (RBAC role authorization)             │
│  5. validate({ body, query, params }) (Zod schemas)    │
│  6. Controllers (Business Logic & Response Formatting) │
│  7. Drizzle ORM (Type-safe SQL queries)                │
│  8. Global Error Handler & ApiError Pipeline           │
└────────────────────────────────────────────────────────┘
           │
           ├────────────────────────────┐
           ▼                            ▼
[ Neon Serverless PostgreSQL ]    [ Cloudinary CDN ]
(14 Tables via Drizzle ORM)       (Document & Image Storage)
```

---

## 2. Directory Tree & File Inventory

```
netro-backend/
├── .env                              # Environment variables (PORT, DATABASE_URL, JWT_SECRET, CLOUDINARY_*)
├── .env.example                      # Template for environment configuration
├── drizzle.config.js                 # Drizzle ORM configuration pointing to Neon PostgreSQL
├── package.json                      # Dependencies: express, drizzle-orm, @neondatabase/serverless, zod, etc.
├── BACKEND_ARCHITECTURE.md           # This master documentation
├── README.md                         # Quick start & repository summary
└── src/
    ├── server.js                     # Server entrypoint; tests DB connection and triggers seeder if empty
    ├── app.js                        # Express app setup, CORS, route mounting (/api/v1 & /api), error handlers
    ├── config/
    │   └── cloudinary.js             # Cloudinary SDK config & uploadBufferToCloudinary streaming helper
    ├── db/
    │   ├── index.js                  # Drizzle ORM instance connected to Neon serverless pool
    │   ├── schema.js                 # 14 Drizzle PostgreSQL table schemas & types
    │   └── seed.js                   # Initial seed data for users, doctors, departments, medicines, etc.
    ├── middleware/
    │   ├── auth.js                   # verifyToken (JWT validation) & requireRoles (RBAC authorization)
    │   ├── errorHandler.js           # notFound (404) & global errorHandler (handles ApiError & MulterError)
    │   ├── upload.js                 # Multer memory storage & singleFileFromFields helper
    │   └── validate.js               # Zod request validator middleware (strips unknown fields, coerces types)
    ├── routes/
    │   ├── index.js                  # Central router mounting all resource sub-routers
    │   ├── auth.routes.js            # /auth (login, register, me, change-password)
    │   ├── department.routes.js      # /departments (CRUD + public read)
    │   ├── doctor.routes.js          # /doctors (CRUD + public read)
    │   ├── equipment.routes.js       # /equipment (CRUD, stats, maintenance logs)
    │   ├── expense.routes.js         # /expenses (CRUD, stats, date/category filtering)
    │   ├── health.routes.js          # /health (service status, uptime, timestamps)
    │   ├── staff.routes.js           # /staff (CRUD, stats, rosters, payrolls, leave requests)
    │   └── upload.routes.js          # /upload/image (Cloudinary file upload)
    ├── controllers/
    │   ├── auth.controller.js        # Auth logic, JWT issuance, password hashing
    │   ├── department.controller.js  # Department CRUD & slug generation
    │   ├── doctor.controller.js      # Doctor directory, filtering & fee structures
    │   ├── equipment.controller.js   # Equipment inventory, metrics & maintenance logs
    │   ├── expense.controller.js     # Hospital expenses, financial aggregates & stats
    │   ├── staff.controller.js       # Staff, rosters, payroll calculations & leave approvals
    │   └── upload.controller.js      # Upload handler connecting multer buffer to Cloudinary
    ├── validators/
    │   ├── common.js                 # Reusable Zod field primitives (requiredString, dates, numbers, etc.)
    │   ├── auth.validator.js         # Zod schemas for login, registration, password update
    │   ├── department.validator.js   # Zod schemas for department create/update
    │   ├── doctor.validator.js       # Zod schemas for doctor create/update
    │   ├── equipment.validator.js    # Zod schemas for equipment & maintenance logs
    │   ├── expense.validator.js      # Zod schemas for expenses & query parameters
    │   ├── staff.validator.js        # Zod schemas for staff, rosters, payrolls & leave
    │   └── upload.validator.js       # Zod schemas for upload request body
    ├── utils/
    │   ├── ApiError.js               # Custom error class with HTTP status codes (badRequest, notFound, etc.)
    │   ├── generateId.js             # Unique ID generator (e.g. staff_1730198400000_k3x9) & today() helper
    │   ├── pagination.js             # getPagination (page, limit, offset) & buildPaginationMeta
    │   └── query.js                  # Drizzle query condition combiners (combineConditions, getQueryString)
    └── scripts/
        └── migrateStaffAndEquipment.js # Migration script creating staff, rosters, equipment tables in Neon
```

---

## 3. Database Schema Specification (Neon PostgreSQL)

All database entities are defined with Drizzle ORM in [src/db/schema.js](file:///d:/Eterces/Ongoging/netro-hospital/netro-backend/src/db/schema.js).

| Table Name | Primary Key | Description & Key Columns |
| :--- | :--- | :--- |
| **`users`** | `id` (varchar 64) | Staff & admin authentication records. Columns: `name`, `email` (unique), `password` (bcrypt), `role` (`admin`, `pharmacist`, `doctor`, `staff`), `branchName`, `avatar`, `phone`, `isActive`. |
| **`doctors`** | `id` (varchar 64) | Clinical doctor directory. Columns: `name`, `departmentId`, `department`, `specialty`, `experience`, `isHead`, `firstVisitFee`, `secondVisitFee`, `dailyPatientLimit`, `consultationStartTime`, `consultationEndTime`, `availableDays` (jsonb), `image`, `status`, `rating`. |
| **`departments`** | `id` (varchar 64) | Hospital medical & clinical departments. Columns: `name`, `slug` (unique), `description`, `icon`, `image`, `headOfDepartment`, `floor`, `roomNumber`, `contactEmail`, `contactPhone`, `doctorsCount`, `status`. |
| **`staff`** | `id` (varchar 64) | HR & hospital staff directory. Columns: `name`, `designation`, `departmentId`, `department`, `phone`, `email`, `address`, `photo`, `joiningDate`, `salary`, `bloodGroup`, `emergencyContact`, `qualification`, `documents` (jsonb), `status` (`Active`, `On Leave`, `Resigned`). |
| **`duty_rosters`** | `id` (varchar 64) | Shift scheduling for clinical & non-clinical staff. Columns: `staffId`, `staffName`, `staffRole`, `department`, `shift` (Morning, Evening, Night), `date`, `wardOrRoom`, `status` (`Scheduled`, `Present`, `Completed`, `Absent`), `notes`. |
| **`payrolls`** | `id` (varchar 64) | Monthly salary & disbursement records. Columns: `staffId`, `staffName`, `month`, `basicSalary`, `bonus`, `deduction`, `netSalary`, `paymentStatus` (`Paid`, `Pending`), `paymentDate`, `paymentMethod`, `remarks`. |
| **`leave_requests`** | `id` (varchar 64) | Leave applications & administrative approvals. Columns: `staffId`, `staffName`, `leaveType`, `startDate`, `endDate`, `totalDays`, `reason`, `status` (`Pending`, `Approved`, `Rejected`), `approvedBy`. |
| **`equipment`** | `id` (varchar 64) | Medical machinery & biomedical equipment inventory. Columns: `name`, `modelNo`, `serialNumber`, `category`, `quantity`, `roomNumber`, `floor`, `department`, `manufacturer`, `purchaseDate`, `warrantyExpiry`, `status` (`Functional`, `Under Maintenance`, `Non-functional`), `lastServiceDate`, `nextServiceDate`, `technicianContact`, `photo`. |
| **`maintenance_logs`** | `id` (varchar 64) | Historical service & repair logs for equipment. Columns: `equipmentId`, `equipmentName`, `serviceDate`, `servicedBy`, `cost`, `description`, `statusAfterService`, `nextScheduledDate`. |
| **`expenses`** | `id` (varchar 64) | Hospital operational expenses & financial outlays. Columns: `title`, `description`, `date`, `amount`, `purpose`, `category`, `billCopy`, `voucherNo`, `paymentMethod`, `paidTo`, `status`, `recordedBy`. |
| **`patients`** | `id` (varchar 64) | Patient profiles. Columns: `name`, `age`, `gender`, `phone`, `email`, `bloodGroup`, `address`, `memberId`. |
| **`appointments`** | `id` (varchar 64) | OPD appointments. Columns: `patientId`, `patientName`, `doctorId`, `doctorName`, `date`, `time`, `status`, `type`. |
| **`medicines`** | `id` (varchar 64) | Pharmacy stock with multi-unit packaging. Columns: `name`, `generic`, `category`, `cartonQty`, `packetPerCarton`, `piecePerPacket`, `totalPieces`, `unitSellingPrice`, `stripSellingPrice`, `batchNo`, `expiryDate`. |
| **`pharmacy_invoices`**| `id` (varchar 64) | POS pharmacy billing. Columns: `invoiceNo`, `customerName`, `phone`, `subtotal`, `discountAmount`, `grandTotal`, `items` (jsonb). |
| **`pharmacies`** | `id` (integer identity, starts at **1001**) | Independent pharmacy outlets created by hospital admins. The numeric `id` is the pharmacy code used at login. Columns: `name`, `address`, `phone`, `email`, `licenseNo` (unique), `isActive`, `createdBy` (admin user id). |
| **`pharmacy_users`** | `id` (varchar 64) | Pharmacy-side accounts, **separate from hospital `users`**. Columns: `pharmacyId` (FK → `pharmacies.id`, cascade), `name`, `phone` (unique **per pharmacy**), `email`, `password` (bcrypt), `role` (`owner`, `manager`, `pharmacist`, `cashier`, `staff`), `isActive`, `lastLoginAt`. |

---

## 4. API Endpoint Matrix & Client Integration

Both `/api/v1` and `/api` (legacy backward compatibility) point to the same router. The frontend `netro-management-system` defaults to `http://localhost:5001/api`.

### 4.1 Authentication (`/auth`)
| Method | Endpoint | Access | Validator | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | `loginSchema` | Authenticates email & password, returns JWT token & sanitized user object. |
| `POST` | `/auth/register` | Public | `registerSchema` | Registers a new user account with role. |
| `GET` | `/auth/me` | Bearer Token | - | Returns currently authenticated user profile from DB. |
| `POST` | `/auth/change-password` | Bearer Token | `changePasswordSchema` | Updates password with current password verification. |

### 4.2 Departments (`/departments`)
| Method | Endpoint | Access | Validator | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/departments` | Authenticated | - | List all departments with doctor counts. |
| `GET` | `/departments/:id` | Authenticated | - | Get department details by ID or slug. |
| `POST` | `/departments` | Admin Only | `createDepartmentSchema` | Creates new department with auto-generated slug. |
| `PUT` | `/departments/:id` | Admin Only | `updateDepartmentSchema` | Updates department fields. |
| `DELETE`| `/departments/:id` | Admin Only | - | Deletes department. |

### 4.3 Doctors (`/doctors`)
| Method | Endpoint | Access | Validator | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/doctors` | Authenticated | - | List doctors with filtering (`search`, `department`, `status`, `page`, `limit`). |
| `GET` | `/doctors/:id` | Authenticated | - | Get doctor by ID. |
| `POST` | `/doctors` | Admin Only | `createDoctorSchema` | Registers new doctor profile with consultation hours & fees. |
| `PUT` | `/doctors/:id` | Admin Only | `updateDoctorSchema` | Updates doctor details. |
| `DELETE`| `/doctors/:id` | Admin Only | - | Deletes doctor profile. |

### 4.4 Staff & HR Operations (`/staff`)
| Method | Endpoint | Access | Validator | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/staff` | Authenticated | - | List staff members (`search`, `department`, `designation`, `status`, pagination). |
| `GET` | `/staff/stats` | Authenticated | - | Returns staff counts (total, on duty, on leave, active departments). |
| `GET` | `/staff/:id` | Authenticated | - | Get staff profile with uploaded documents. |
| `POST` | `/staff` | Admin Only | `createStaffSchema` | Creates staff profile. |
| `PUT` | `/staff/:id` | Admin Only | `updateStaffSchema` | Updates staff profile. |
| `DELETE`| `/staff/:id` | Admin Only | - | Deletes staff profile. |
| `GET` | `/staff/rosters` | Authenticated | - | List duty rosters (`department`, `shift`, `date`, `status`). |
| `POST` | `/staff/rosters` | Authenticated | `createDutyRosterSchema` | Creates duty roster shift entry. |
| `PUT` | `/staff/rosters/:id` | Authenticated | `updateDutyRosterSchema` | Updates shift schedule or attendance status. |
| `DELETE`| `/staff/rosters/:id`| Admin Only | - | Deletes roster entry. |
| `GET` | `/staff/payrolls` | Authenticated | - | List payrolls (`month`, `paymentStatus`). |
| `POST` | `/staff/payrolls` | Admin Only | `createPayrollSchema` | Creates monthly payroll entry with basic, bonus, and deductions. |
| `GET` | `/staff/leaves` | Authenticated | - | List leave requests (`status`, `staffId`). |
| `POST` | `/staff/leaves` | Authenticated | `createLeaveRequestSchema` | Submits a new leave application. |
| `PATCH` | `/staff/leaves/:id/status` | Admin Only | `updateLeaveStatusSchema` | Approves or rejects leave (`Approved` or `Rejected`). |

### 4.5 Medical Equipment Tracking (`/equipment`)
| Method | Endpoint | Access | Validator | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/equipment` | Authenticated | - | List equipment (`search`, `category`, `department`, `status`, pagination). |
| `GET` | `/equipment/stats` | Authenticated | - | Equipment metrics (total, functional, maintenance, non-functional, total value). |
| `GET` | `/equipment/:id` | Authenticated | - | Get equipment details by ID. |
| `POST` | `/equipment` | Admin Only | `createEquipmentSchema` | Registers new medical equipment. |
| `PUT` | `/equipment/:id` | Admin Only | `updateEquipmentSchema` | Updates equipment record & service notes. |
| `DELETE`| `/equipment/:id` | Admin Only | - | Deletes equipment. |
| `GET` | `/equipment/maintenance` | Authenticated | - | List maintenance history logs (`equipmentId`). |
| `POST` | `/equipment/maintenance` | Admin Only | `createMaintenanceLogSchema` | Records servicing event and automatically updates equipment service dates. |

### 4.6 Hospital Expenses (`/expenses`)
| Method | Endpoint | Access | Validator | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/expenses` | Authenticated | `expenseListQuerySchema` | List expenses (`search`, `category`, `status`, `startDate`, `endDate`, pagination). |
| `GET` | `/expenses/stats` | Authenticated | - | Aggregated statistics (total outlay, monthly total, category breakdowns). |
| `GET` | `/expenses/:id` | Authenticated | - | Get expense voucher details. |
| `POST` | `/expenses` | Authenticated | `createExpenseSchema` | Records expense voucher with attached bill URL. |
| `PUT` | `/expenses/:id` | Authenticated | `updateExpenseSchema` | Updates expense voucher. |
| `DELETE`| `/expenses/:id` | Admin Only | - | Deletes expense record. |

### 4.7 Cloudinary Upload (`/upload/image`)
| Method | Endpoint | Access | Fields | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/upload/image` | Authenticated | `file` or `image` (multipart), `folder` (string) | Streams buffer to Cloudinary CDN, returns secure CDN URL, filename, and mime type. |


### 4.8 Pharmacy System (`/pharmacies`, `/pharmacy-auth`)

Independent pharmacies with their own authentication, separate from hospital `users`.

- **Pharmacy ID:** sequential integer starting at `1001`.
- **Login:** `pharmacyId` + `phone` + `password`. Pharmacy JWTs carry `scope: "pharmacy"`; they are rejected by every hospital endpoint, and hospital tokens are rejected by `/pharmacy-auth/*`.
- **Registration:** no public sign-up. A hospital admin creates the pharmacy together with its first `owner`; owners/managers add the rest of the staff.
- **Hospital admins** have full access to every pharmacy's endpoints.
- **Deactivating** a pharmacy or user blocks login and invalidates existing tokens immediately (checked on every request).

**Role permissions (staff management)**

| Actor | Can create / edit / delete / reset password for | Notes |
| :--- | :--- | :--- |
| Hospital `admin` | Any role, incl. `owner` | Any pharmacy. |
| `owner` | `manager`, `pharmacist`, `cashier`, `staff` | Own pharmacy only. |
| `manager` | `pharmacist`, `cashier`, `staff` | Own pharmacy only. |
| `pharmacist`, `cashier`, `staff` | — | Self-service only (`/pharmacy-auth/me`, `change-password`). |

Users may edit their own name/phone/email via `PUT /users/:userId` but cannot change their own role/status or delete themselves. A pharmacy must always keep at least one active owner.

**Admin — pharmacy registry** (hospital `admin` token)

| Method | Endpoint | Validator | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/pharmacies` | `createPharmacySchema` | Create pharmacy + owner (`owner: { name, phone, email?, password }`) in one transaction. |
| `GET` | `/pharmacies` | `listPharmaciesQuerySchema` | List with `search` (name / license / phone / exact ID), `isActive`, pagination. Includes `userCount`. |
| `GET` | `/pharmacies/:pharmacyId` | - | Details + `owners` + `staffByRole` counts. |
| `PUT` | `/pharmacies/:pharmacyId` | `updatePharmacySchema` | Update name, address, phone, email, licenseNo. |
| `PATCH` | `/pharmacies/:pharmacyId/status` | `pharmacyStatusSchema` | `{ isActive }` — activate / deactivate. |
| `POST` | `/pharmacies/:pharmacyId/reset-owner-password` | `resetPasswordSchema` | Reset the (oldest) owner's password. |

**Pharmacy auth**

| Method | Endpoint | Access | Validator | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/pharmacy-auth/login` | Public | `pharmacyLoginSchema` | Returns JWT + `user` + `pharmacy`. |
| `GET` | `/pharmacy-auth/me` | Pharmacy token | - | Current user and their pharmacy. |
| `POST` | `/pharmacy-auth/change-password` | Pharmacy token | `pharmacyChangePasswordSchema` | Change own password. |

**Pharmacy users** (`owner` / `manager` of that pharmacy, or hospital `admin`)

| Method | Endpoint | Validator | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/pharmacies/:pharmacyId/users` | `listPharmacyUsersQuerySchema` | List with `search`, `role`, `isActive`, pagination. |
| `POST` | `/pharmacies/:pharmacyId/users` | `createPharmacyUserSchema` | Add user (`role` defaults to `staff`). |
| `GET` | `/pharmacies/:pharmacyId/users/:userId` | - | Get user. |
| `PUT` | `/pharmacies/:pharmacyId/users/:userId` | `updatePharmacyUserSchema` | Update name, phone, email, role, isActive. |
| `POST` | `/pharmacies/:pharmacyId/users/:userId/reset-password` | `resetPasswordSchema` | Reset another user's password. |
| `DELETE` | `/pharmacies/:pharmacyId/users/:userId` | - | Remove user. |

---

## 5. Client Redux Toolkit Query Mapping (`netro-management-system`)

The frontend application communicates with `netro-backend` via centralized RTK Query API slices located in `src/store/api/`:

```
netro-management-system/src/store/api/
├── baseApi.ts          # Central baseQuery with Bearer JWT injection & cache tag invalidation
├── authApi.ts          # useLoginMutation, useGetMeQuery, useChangePasswordMutation
├── departmentApi.ts    # useGetDepartmentsQuery, useCreateDepartmentMutation, useUploadDepartmentImageMutation
├── doctorApi.ts        # useGetDoctorsQuery, useCreateDoctorMutation, useUploadDoctorImageMutation
├── expenseApi.ts       # useGetExpensesQuery, useGetExpenseStatsQuery, useCreateExpenseMutation
├── staffApi.ts         # useGetStaffQuery, useGetDutyRostersQuery, useGetPayrollsQuery, useGetLeaveRequestsQuery
└── equipmentApi.ts     # useGetEquipmentQuery, useGetEquipmentStatsQuery, useCreateMaintenanceLogMutation
```

### Cache Invalidation & Tag Types:
- `Auth`: User session, login, password changes.
- `Doctors`: Doctor profiles, availability schedules.
- `Departments`: Department lists, doctor counters.
- `Expenses` & `Stats`: Financial outlays and KPI cards.
- `Staff`, `Rosters`, `Payrolls`, `Leaves`: HR operations.
- `Equipment`, `Maintenance`: Biomedical inventory and service logs.

---

## 6. Pre-Configured Seed Credentials

Seeded via [src/db/seed.js](file:///d:/Eterces/Ongoging/netro-hospital/netro-backend/src/db/seed.js) into Neon DB:

1. **Hospital Director / Super Administrator**:
   - **Email:** `admin@netro.com`
   - **Password:** `12345678`
   - **Role:** `admin` (Full read/write/delete permissions across all modules)

2. **Chief Pharmacist (Standard Alias)**:
   - **Email:** `pharmacy@netro.com`
   - **Password:** `12345678`
   - **Role:** `pharmacist`

3. **Chief Pharmacist (Branch #1)**:
   - **Email:** `pharmarcy@netro.com`
   - **Password:** `12345678`
   - **Role:** `pharmacist`

4. **Pharmacy users** (separate pharmacy login: `POST /pharmacy-auth/login`, password `12345678` for all):

   | Pharmacy | Phone | Role |
   | :--- | :--- | :--- |
   | `1001` Netro Care Pharmacy | `01711000001` | `owner` |
   | `1001` | `01711000002` | `manager` |
   | `1001` | `01711000003` | `pharmacist` |
   | `1001` | `01711000004` | `cashier` |
   | `1001` | `01711000005` | `staff` |
   | `1002` Netro Health Pharmacy | `01811000001` | `owner` |
   | `1002` | `01811000002` | `pharmacist` |
   | `1002` | `01811000003` | `cashier` |
   | `1002` | `01811000004` | `staff` |

   IDs assume a fresh database (the identity sequence starts at 1001).
