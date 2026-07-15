# MediKeep — Frontend

Full-stack medical dashboard for doctors and patients. Built with Next.js 14 App Router, Tailwind CSS, React Query, and Socket.IO.

## Quick Start

```bash
npm install
# Copy your bone background image:
cp /path/to/authbg.jpg public/authbg.jpg

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## Important — Auth Background

Place your bone illustration image at:
```
public/authbg.jpg
```
This is used by the login and register pages as the left-panel background.

## Pages (15 total)

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Login with email + password |
| `/register` | Public | 2-step registration (account → role) |
| `/verify-email` | Public | Email verification status |
| `/forgot-password` | Public | Request password reset |
| `/reset-password` | Public | Set new password via token |
| `/dashboard` | Auth | Role-aware home with stats + charts |
| `/appointments` | Auth | List, filter, manage appointments |
| `/appointments/new` | Auth | Book (patient) or give (doctor) |
| `/patients` | Doctor | Linked patient list, add/edit/unlink |
| `/patients/[id]` | Doctor | Patient detail with tabs |
| `/prescriptions` | Auth | Prescription list + PDF download |
| `/prescriptions/new` | Doctor | Issue new prescription |
| `/notifications` | Auth | Real-time notification feed |
| `/profile` | Auth | Edit account info + change password |
| `/analytics` | Auth | Charts: monthly trends, status breakdown |

## Tech Stack

- **Next.js 14** — App Router, server components
- **Tailwind CSS** — utility-first styling, custom green palette
- **React Query** — server state, caching, mutations
- **React Hook Form + Zod** — form validation
- **Recharts** — bar, line, pie charts
- **Socket.IO client** — real-time notifications
- **Axios** — HTTP with auto token refresh

## Design System

- Color: green palette (`primary-50` → `primary-900`)
- Font: Inter (Google Fonts)
- Radius: `rounded-2xl` throughout
- Auth pages: bone illustration background (`authbg.jpg`) on left panel
