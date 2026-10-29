# Netro Hospital Backend API

Express.js and Node.js REST API server for **Netro Hospital Management System** and **Netro Hospital Mobile App**.

## Tech Stack
- **Node.js**
- **Express.js**
- **Nodemon** (development hot reload)
- **CORS**, **Morgan**, **Dotenv**

## Installation & Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Run in development mode (with nodemon):
   ```bash
   npm run dev
   ```

4. Run in production mode:
   ```bash
   npm start
   ```

## API Endpoints

- `GET /` - Root status & docs
- `GET /api/v1/health` - Service health status
- `GET /api/v1/doctors` - Get all doctors
- `GET /api/v1/doctors/:id` - Get doctor details
- `POST /api/v1/doctors` - Add new doctor
- `GET /api/v1/patients` - List all patients
- `GET /api/v1/patients/:id` - Get patient details
- `POST /api/v1/patients` - Register patient
- `GET /api/v1/appointments` - List appointments
- `POST /api/v1/appointments` - Book appointment
- `PATCH /api/v1/appointments/:id/status` - Update appointment status
