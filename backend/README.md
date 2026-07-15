# MediKeep — Backend API

> RESTful API for the MediKeep healthcare management platform. Built with Node.js, Express, and MySQL.

---

## Overview

The MediKeep backend provides a secure, role-based REST API serving doctors and patients. It handles authentication with JWT httpOnly cookies, appointment scheduling, prescription management, notifications, and analytics — all backed by a relational MySQL database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MySQL 8 via `mysql2/promise` |
| Auth | JWT (httpOnly cookies) — access + refresh tokens |
| Password hashing | bcrypt (12 rounds) |
| Validation | Joi + express-validator |
| Email | Nodemailer (Ethereal for dev) |
| PDF | PDFKit |
| Security | Helmet, CORS, express-rate-limit, XSS sanitizer |

---

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8 running locally or remotely

### Installation

```bash
cd backend
npm install
```

### Environment variables

Create `.env` in the `backend/` folder:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=medi_keep

# JWT Secrets — must be at least 32 characters, must be different
ACCESS_TOKEN_SECRET=your_access_secret_min_32_chars_here
REFRESH_TOKEN_SECRET=your_refresh_secret_min_32_chars_here
ACCESS_TOKEN_EXPIRY=30m
REFRESH_TOKEN_EXPIRY=7d

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:3000

# Email (Ethereal for dev — get free credentials at https://ethereal.email)
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your_ethereal_user
EMAIL_PASS=your_ethereal_pass
```

### Database setup

```bash
mysql -u root -p < db/schema.sql
```

Then run the additional tables required (not in the original schema):

```sql
CREATE TABLE IF NOT EXISTS token_blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jti VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    INDEX idx_jti (jti)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS account_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    type ENUM('activate', 'invite') NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS doctor_patient_link (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    patient_user_id INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    unlinked_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_link (doctor_id, patient_user_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS verification_expires DATETIME DEFAULT NULL;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS body TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS data JSON DEFAULT NULL;
```

### Run

```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

Server starts on `http://localhost:5000`.

---

## Project Structure

```
backend/
├── app.js                     # Express app setup, middleware, routes
├── server.js                  # HTTP server entry point
├── config/
│   └── db.js                  # MySQL connection pool
├── controllers/
│   ├── authController.js
│   ├── appointmentController.js
│   ├── doctorController.js
│   ├── patientController.js
│   ├── prescriptionController.js
│   ├── notificationController.js
│   └── analytics.controller.js
├── services/
│   ├── authService.js
│   ├── appointmentService.js
│   ├── doctorService.js
│   ├── patientService.js
│   ├── prescriptionService.js
│   ├── notificationService.js
│   └── analyticsService.js
├── models/
│   ├── appointment.model.js
│   ├── doctor.model.js
│   ├── patient.model.js
│   ├── prescription.model.js
│   └── notification.model.js
├── routes/
│   ├── auth.routes.js
│   ├── appointment.routes.js
│   ├── doctor.routes.js
│   ├── patient.routes.js
│   ├── prescription.routes.js
│   ├── notification.routes.js
│   ├── analytics.routes.js
│   └── user.routes.js
├── middlewares/
│   ├── authMiddleware.js       # JWT verification + auto refresh
│   ├── roleMiddleware.js       # Role-based access control
│   ├── rateLimiter.js          # Per-route rate limits
│   ├── sanitizer.js            # XSS + input sanitization
│   ├── validators.js           # Joi validation middleware
│   └── errorHandler.js         # Global error handler
├── validations/
│   ├── authValidation.js
│   ├── appointmentValidations.js
│   ├── doctorValidations.js
│   ├── patientValidation.js
│   ├── prescriptionValidation.js
│   └── notificationValidations.js
├── utils/
│   ├── asyncWrapper.js         # Async error wrapper
│   ├── generateToken.js        # JWT generation + verification
│   ├── getDoctorId.js          # user_id → doctor.id helper
│   ├── sendEmail.js            # Nodemailer wrapper
│   └── cleanup.js              # Expired token cleanup job
└── db/
    └── schema.sql              # Base database schema
```

---

## API Reference

Base URL: `http://localhost:5000/api`

All protected routes require valid `accessToken` cookie. Cookies are set automatically on login.

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create account (doctor or patient) |
| POST | `/login` | No | Login — sets httpOnly cookies |
| POST | `/logout` | Yes | Blacklist token + clear cookies |
| POST | `/refresh` | No | Refresh access token via cookie |
| GET | `/profile` | Yes | Get current user profile |
| GET | `/verify/:token` | No | Verify email from link |
| POST | `/forgot-password` | No | Send password reset email |
| POST | `/reset-password` | No | Set new password via token |

### Appointments — `/api/appointments`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/book` | Patient | Book appointment with a doctor |
| GET | `/my-appointments` | Patient | List own appointments (paginated, filtered) |
| PUT | `/cancel/:id` | Patient | Cancel an appointment |
| POST | `/give` | Doctor | Schedule appointment for a patient |
| GET | `/doctor-appointments` | Doctor | List all doctor appointments |
| PUT | `/status/:id` | Doctor | Update status (confirmed / completed / cancelled) |

### Doctor — `/api/doctor`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/dashboard` | Doctor | Dashboard stats |
| POST | `/patients` | Doctor | Add + link a patient |
| GET | `/patients` | Doctor | List linked patients (search, filter, paginate) |
| PUT | `/patients/:patientUserId` | Doctor | Edit patient info |
| DELETE | `/patients/:patientUserId` | Doctor | Unlink patient (soft delete) |

### Patients — `/api/patients`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/search-doctors` | Patient | Search doctors by name / specialty |
| GET | `/profile` | Patient | Get own profile |
| PUT | `/profile` | Patient | Update own profile |
| POST | `/profile/complete` | Patient | First-time profile completion |

### Prescriptions — `/api/prescriptions`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/my-prescriptions` | Patient | List own prescriptions (paginated) |
| POST | `/` | Doctor | Issue new prescription |
| PUT | `/:prescription_id` | Doctor | Edit prescription |
| DELETE | `/:prescription_id` | Doctor | Delete prescription |
| GET | `/:id/pdf` | Doctor + Patient | Download prescription as PDF |

### Notifications — `/api/notifications`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List notifications (paginated) |
| GET | `/stats` | Yes | Unread count + total |
| PUT | `/:id/read` | Yes | Mark one as read |
| PUT | `/mark-all-read` | Yes | Mark all as read |
| POST | `/` | Yes | Create notification (system use) |

### Analytics — `/api/analytics`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/doctor` | Doctor | Patient count, appointments, prescriptions, monthly stats |
| GET | `/patient` | Patient | Total appointments, upcoming, prescriptions, doctors visited |
| GET | `/dashboard` | Doctor + Patient | Route to role-appropriate analytics |

---

## Security Features

**Authentication**
- JWT access tokens (30 min) + refresh tokens (7 days) stored in `httpOnly`, `SameSite: Strict` cookies
- Token blacklist table for immediate logout invalidation
- Token fingerprinting to detect theft
- Auto token refresh via middleware on expired access token

**Account protection**
- Account lockout after 5 failed login attempts (30 min lock)
- Email verification required before first login
- bcrypt password hashing with 12 rounds
- Password reset tokens expire after 1 hour

**Request security**
- Helmet.js sets 11 security headers
- CORS locked to `FRONTEND_URL` only
- Rate limiting per route (login: 5/15min, register: 3/hour, general: 100/15min)
- XSS sanitization on all inputs via `xss` library
- Joi + express-validator double validation layer
- Parameterized queries throughout (no raw SQL concatenation)

---

## Appointment Business Rules

- Appointments must be scheduled **in the future**
- Only on **weekdays (Mon–Fri)**, between **08:00 and 18:00**
- Maximum **30 days in advance**
- Patients can have **1 appointment per day** max
- Patients can have **3 pending appointments** max at once
- Doctor conflict check — no double-booking the same slot

---

## Background Tasks

A cleanup job runs every 12 hours automatically:

```js
setInterval(cleanExpiredTokens, 12 * 60 * 60 * 1000)
```

It removes expired entries from `token_blacklist` and `refresh_tokens` tables.

---

## Error Response Format

All errors follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

| Status | Meaning |
|---|---|
| 400 | Validation error |
| 401 | Not authenticated / token expired |
| 403 | Wrong role / email not verified / account locked |
| 404 | Resource not found |
| 409 | Duplicate entry (email already exists) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Scripts

```bash
npm run dev     # nodemon — auto-restart on file changes
npm start       # production
npm test        # placeholder (no tests yet)
```

---

## .gitignore

```
node_modules/
.env
```

---

## Related

- [Frontend README](../README.md) — Next.js dashboard
