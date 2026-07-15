## MediKeep

> A full-stack healthcare management platform connecting doctors and patients through a clean, secure, and role-aware web application.

---

## What is MediKeep?

MediKeep is a medical dashboard built as a portfolio project simulating a real-world clinic management system. Doctors can manage their patient list, schedule appointments, issue prescriptions, and track analytics. Patients can book appointments with doctors, view their prescriptions, and monitor their health activity — all in real time.

The project is split into two independent applications that work together:

```
MediKeep/
├── frontend/     ← Next.js 14 web app
└── backend/      ← Node.js + Express REST API
```

---

## Features

### For Doctors
- Secure login with role detection
- Dashboard with patient count, today's appointments, and monthly charts
- Add, edit, and unlink patients
- Schedule appointments for patients
- Confirm, complete, or cancel appointments
- Issue, edit, and delete prescriptions with PDF export
- Real-time notifications when patients book appointments
- Analytics with bar, line, and donut charts

### For Patients
- Register and verify email before first login
- Search doctors by name or specialty
- Book appointments (weekdays only, business hours, max 3 pending)
- View and download prescriptions as PDF
- Real-time notifications for new appointments and prescriptions
- Personal profile with health history overview

### Platform-wide
- JWT authentication via httpOnly cookies — no localStorage
- Automatic token refresh — sessions stay alive seamlessly
- Account lockout after 5 failed login attempts
- Email verification on registration
- Password reset via email link
- Role-based access control — doctors and patients see completely different UIs

---

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS — custom green medical palette |
| Server state | React Query v5 |
| Forms | React Hook Form + Zod |
| HTTP client | Axios with auto refresh interceptor |
| Charts | Recharts |
| Real-time | Socket.IO client |

### Backend
| | |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MySQL 8 |
| Auth | JWT — access token (30min) + refresh token (7d) |
| Password | bcrypt (12 rounds) |
| Validation | Joi + express-validator |
| Email | Nodemailer |
| PDF | PDFKit |
| Security | Helmet, CORS, rate-limit, XSS sanitizer |

---

## Project Structure

```
MediKeep/
│
├── frontend/
│   ├── app/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── verify-email/
│   │   └── (protected)/
│   │       ├── dashboard/
│   │       ├── appointments/
│   │       ├── patients/
│   │       ├── prescriptions/
│   │       ├── notifications/
│   │       ├── profile/
│   │       └── analytics/
│   ├── components/
│   │   ├── auth/
│   │   ├── layout/
│   │   └── ui/
│   ├── lib/
│   │   ├── api.js
│   │   ├── auth.jsx
│   │   ├── socket.js
│   │   └── utils.js
│   └── public/
│       └── authbg.jpg
│
└── backend/
    ├── controllers/
    ├── services/
    ├── models/
    ├── routes/
    ├── middlewares/
    ├── validations/
    ├── utils/
    ├── config/
    │   └── db.js
    ├── db/
    │   └── schema.sql
    ├── app.js
    └── server.js
```

---

## Pages

| Route | Role | Description |
|---|---|---|
| `/login` | Public | Email + password login |
| `/register` | Public | 2-step: account → role selection |
| `/verify-email` | Public | Email verification |
| `/forgot-password` | Public | Request reset link |
| `/reset-password` | Public | Set new password |
| `/dashboard` | Both | Role-aware home with stats and charts |
| `/appointments` | Both | List, filter, manage appointments |
| `/appointments/new` | Both | Book (patient) or give (doctor) |
| `/patients` | Doctor | Linked patient list — add, edit, unlink |
| `/patients/[id]` | Doctor | Patient detail with tabs |
| `/prescriptions` | Both | List with PDF download |
| `/prescriptions/new` | Doctor | Issue new prescription |
| `/notifications` | Both | Real-time notification feed |
| `/profile` | Both | Edit info + change password |
| `/analytics` | Both | Charts and health stats |

---

## API Overview

Base URL: `http://localhost:5000/api`

| Group | Endpoints |
|---|---|
| Auth | `/auth/register` `/auth/login` `/auth/logout` `/auth/refresh` `/auth/profile` `/auth/verify/:token` `/auth/forgot-password` `/auth/reset-password` |
| Appointments | `/appointments/book` `/appointments/my-appointments` `/appointments/cancel/:id` `/appointments/give` `/appointments/doctor-appointments` `/appointments/status/:id` |
| Doctor | `/doctor/dashboard` `/doctor/patients` `/doctor/patients/:id` |
| Patients | `/patients/search-doctors` `/patients/profile` |
| Prescriptions | `/prescriptions` `/prescriptions/my-prescriptions` `/prescriptions/:id` `/prescriptions/:id/pdf` |
| Notifications | `/notifications` `/notifications/stats` `/notifications/:id/read` `/notifications/mark-all-read` |
| Analytics | `/analytics/doctor` `/analytics/patient` `/analytics/dashboard` |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/hadjerSilmi-0000/medikeep.git
cd medikeep
```

### 2. Set up the database

```bash
mysql -u root -p < backend/db/schema.sql
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
# Fill in DB credentials, JWT secrets, email config
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 4. Configure the frontend

```bash
cd ../frontend
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" >> .env.local
echo "NEXT_PUBLIC_SOCKET_URL=http://localhost:5000" >> .env.local

# Place your bone illustration background
cp /path/to/authbg.jpg public/authbg.jpg

npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

---

## Environment Variables

### Backend — `backend/.env`

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=medi_keep

ACCESS_TOKEN_SECRET=your_access_secret_minimum_32_characters
REFRESH_TOKEN_SECRET=your_refresh_secret_minimum_32_characters
ACCESS_TOKEN_EXPIRY=30m
REFRESH_TOKEN_EXPIRY=7d

FRONTEND_URL=http://localhost:3000

EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your_ethereal_user
EMAIL_PASS=your_ethereal_pass
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## Security Highlights

- **httpOnly cookies** — tokens never exposed to JavaScript
- **Token blacklist** — immediate invalidation on logout
- **Account lockout** — 5 failed attempts triggers a 30-minute lock
- **Email verification** — required before first login
- **Rate limiting** — per-route limits (login: 5/15min, register: 3/hour)
- **Helmet.js** — 11 HTTP security headers
- **Input sanitization** — XSS protection on all inputs
- **Parameterized queries** — no raw SQL concatenation anywhere
- **Role-based routing** — middleware blocks wrong-role access at the API level and in the UI

---

## Design

The UI uses a custom light green medical palette with no dark mode. Auth pages feature a full-page anatomical bone illustration background with a centered frosted card. The dashboard uses a persistent sidebar with role-specific navigation. All data tables support pagination, search, and filtering.

---

## Author

**Hadjer Silmi** — software engineer
Portfolio project — Algeria 🇩🇿

---

## License

This project is for educational and portfolio purposes.**
