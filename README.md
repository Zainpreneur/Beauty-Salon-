# Bloom Salon Manager 💇‍♀️

A full-stack business management application for beauty salons and spas —
scheduling, clients, staff, billing/POS, and inventory in one system.

## Stack

- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite (swap the
  `DATABASE_URL` in `backend/.env` to point Prisma at Postgres/MySQL for
  production), JWT auth, Zod validation.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router,
  TanStack Query, Recharts.

## Features

- **Auth & roles** — Admin, Manager, Staff, Receptionist, JWT-based sessions.
- **Clients (CRM)** — profiles, contact info, allergies/notes, appointment &
  purchase history, loyalty points.
- **Appointments** — day-view scheduler grid per stylist, multi-service
  bookings, automatic duration/price calculation, double-booking prevention,
  status tracking (scheduled/confirmed/completed/cancelled/no-show).
- **Services & menu** — categorized service catalog with pricing & duration.
- **Staff** — team management, commission rates, weekly working-hours
  schedules.
- **Billing / POS** — create invoices from a completed appointment or from
  scratch, mix services + retail products, discounts/tax, partial payments,
  multiple payment methods, auto-decrements product stock on sale.
- **Inventory** — retail product catalog, stock levels, low-stock alerts,
  stock-in/out/adjustment ledger.
- **Dashboard** — today's appointments & revenue, 30-day revenue chart, top
  services, upcoming bookings, low-stock count.

## Getting started

### 1. Backend

```bash
cd backend
cp .env.example .env      # adjust JWT_SECRET etc. if you like
npm install
npm run prisma:migrate    # creates the SQLite db + applies schema
npm run seed               # demo staff, services, clients, products
npm run dev                 # http://localhost:4000
```

Demo logins (password `password123` for all):

| Role         | Email               |
| ------------ | -------------------- |
| Admin        | admin@salon.com      |
| Manager      | manager@salon.com    |
| Stylist      | jordan@salon.com     |
| Stylist      | lena@salon.com       |
| Receptionist | front@salon.com      |

### 2. Frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173 and log in with one of the demo accounts above.

## Project structure

```
backend/
  prisma/schema.prisma   # data model (Users, Clients, Services, Appointments, Invoices, Products, ...)
  prisma/seed.ts         # demo data
  src/routes/            # REST API: auth, clients, services, staff, appointments, invoices, inventory, dashboard
  src/middleware/auth.ts # JWT auth + role guards
frontend/
  src/pages/             # Dashboard, Appointments, Clients, Services, Staff, Billing, Inventory, Login
  src/hooks/useResources.ts  # React Query hooks wrapping the API
  src/components/        # Layout, Modal, Avatar, StatusBadge
```

## API overview

All endpoints (except `/api/auth/login`) require `Authorization: Bearer <token>`.

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/clients`
- `GET/POST/PUT/DELETE /api/services`
- `GET/POST/PUT/DELETE /api/staff`, `GET/PUT /api/staff/:id/schedule`
- `GET/POST/PUT/DELETE /api/appointments`
- `GET/POST /api/invoices`, `POST /api/invoices/:id/payments`, `POST /api/invoices/:id/refund`
- `GET/POST/PUT/DELETE /api/inventory/products`, `POST/GET /api/inventory/products/:id/movements`
- `GET /api/dashboard/summary`

## Notes

- SQLite doesn't support native enums in Prisma, so enum-like fields
  (roles, statuses, payment methods, etc.) are plain `String` columns
  validated by Zod at the API layer — see the comment at the top of
  `backend/prisma/schema.prisma` for the valid values of each.
- To move to Postgres for production: change the `datasource` provider in
  `schema.prisma` to `postgresql`, update `DATABASE_URL`, and re-run
  `prisma migrate dev`.
