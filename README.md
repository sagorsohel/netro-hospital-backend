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
- `GET /api/health` - Service health status
- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get doctor details
- `POST /api/doctors` - Add new doctor
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Register patient
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Book appointment
- `PATCH /api/appointments/:id/status` - Update appointment status
