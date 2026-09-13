# LUNOR Business Manager

A complete business management & accounting system for a clothing e-commerce business — sales, orders, inventory, purchases, customers, suppliers, expenses/income, accounts & payments, returns, reports, targets, notifications, activity log, roles and settings.

## Stack

- **Frontend**: Next.js (App Router) + Tailwind CSS v4 + TanStack Query + React Hook Form + Zod + sonner + lucide, plain JS (no TS in the app).
- **Backend**: Express + Mongoose + JWT auth + role-based permissions (MongoDB).
- **Data**: MongoDB — either your own URI (e.g. Atlas) or an embedded auto-started MongoDB replica set for zero-setup dev.

## Getting started

```bash
npm install        # installs client + server workspaces
npm run dev        # runs API (:5000) + client (:3000) together
```

Open http://localhost:3000 and sign in with your admin account.

### Database

The server connects to the MongoDB in `server/.env` (`MONGODB_URI`) — e.g. a MongoDB Atlas cluster. No dummy data is loaded; the database starts clean with your own users.

For a zero-setup local fallback you can run against an embedded replica set instead:

```bash
DB_MODE=embedded node src/index.js   # from server/
```

### Logins

- JWT tokens never expire (`JWT_EXPIRES_IN` empty in `.env`) — a user stays logged in until they explicitly log out.
- `npm run seed` (`DB_MODE=embedded`) loads demo data into the **embedded** store only, never into your real `MONGODB_URI` database.

## Scripts

- `npm run dev` — server + client concurrently
- `npm run dev:server` / `npm run dev:client` — individually
- `npm run seed` — load demo data into the embedded store (never your real DB)
- `npm run build` — production build of the client
- `npm run start:server` — start the API (uses `server/.env`)
- `npm run lint` — ESLint on the client

## Project layout

```
server/src/
  routes/ controllers/ services/ models/ middleware/ utils/
  config/db.js        # connection + embedded replica set setup
  seed.js             # demo data
client/src/
  app/                # routes: (dashboard)/ sales orders products purchases customers suppliers
                      # expenses income accounts returns reports targets notifications activity settings
  components/         # ui primitives, charts, layouts, shared editors
  hooks/              # react-query wrappers
  lib/                # constants, api client, auth context, utils
  services/api.js     # axios instance (JWT + response unwrapping)
```

## API

Mounted under `/api`: `auth`, `users`, `products`, `sales`, `orders`, `customers`, `suppliers`, `purchases`, `expenses`, `incomes`, `accounts`, `returns`, `targets`, `notifications`, `activity`, `settings`, `reports` (including CSV/XLSX/PDF export at `/api/reports/export/<type>/<format>`).

Every response uses `{ success, message, data }`; list endpoints return `data: { data, pagination }`.

## Features

- Role-based access (admin / manager / accountant / staff) per resource.
- Sales with multi-item editing, discounts, delivery charge, profit tracking; partial payments, cancel; printable invoices.
- Orders flowing Pending → Confirmed → Processing → Shipped → Delivered with automatic stock deduction and revenue recognition.
- Inventory stock management (adjustments, low-stock/out-of-stock alerts), purchases.
- Full accounting: accounts, cash flow, expense/income ledgers, automatic payments & ledger entries.
- Returns/refunds against sales and orders.
- Reports & CSV/XLSX/PDF exports, monthly sales targets with progress bars, notifications, activity audit log.
- Business settings (order behavior, inventory alerts, numbering prefixes), team/user management.
- Dashboard with KPIs, revenue/expense charts, cash flow, order status, and low-stock indicators.

## Deployment (Vercel)

Both the Next.js client and the Express API deploy to Vercel — no code changes are required
besides environment variables. The API uses Vercel's zero-config Express support
(`server/src/index.js` is auto-detected and runs as a single Fluid Function).

The repo contains a `.nvmrc` (Node 22) — Vercel uses it for the build; do not change
the project's Node.js Version (Settings → General → Node.js Version) to something older.

### 1. Push the code to GitHub

```bash
# create an empty repo on https://github.com/new (do NOT add a README/license)
git remote add origin https://github.com/<your-user>/lunor-business-manager.git
git push -u origin main
```

### 2. Deploy the client (project 1)

1. Vercel → *Add New… → Project* → Import the `lunor-business-manager` repo.
2. Framework preset: **Next.js**. Set **Root Directory** to `client` — **critical**: if it stays
   at the repo root the server's workspace script will build the wrong project.
3. Under *Environment Variables* add:
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | your server's URL + `/api` (from step 3), e.g. `https://lunor-api-xxxxxxxx.vercel.app/api` |
4. *Deploy*. Note the client URL, e.g. `https://lunor-xxxxxxxx.vercel.app`.

`NEXT_PUBLIC_*` variables are inlined at build time, so a change requires a new build/deploy.

### 3. Deploy the API (project 2)

1. Vercel → *Add New… → Project* → Import the same repo.
2. Framework: it auto-detects **Express** (zero-config). **Set Root Directory to `server`** —
   critical, otherwise Vercel runs the client's build instead. Do NOT add a build command
   or output directory, and do NOT set `NODE_ENV` yourself (Vercel sets it to `production`).
3. Under *Environment Variables* add:
   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | your existing Atlas connection string — the app uses the `lunor_account` database on the same cluster |
   | `JWT_SECRET` | a long random string (`openssl rand -hex 48`) |
   | `JWT_EXPIRES_IN` | leave empty (non-expiring tokens, users stay logged in until logout) |
   | `CLIENT_URL` | the client URL from step 2 (comma-separate multiple origins if needed) |
   | `BUSINESS_TIMEZONE` | `Asia/Dhaka` |
4. *Deploy*. Verify: open `https://<server-url>/api/health` → `{"success":true,...}`.

> The API needs a real `MONGODB_URI`. On Vercel it never falls back to the embedded
> in-memory MongoDB (that path is only for local dev).

### 4. Link them

- Set `CLIENT_URL` = client URL (already done in step 3).
- Set `NEXT_PUBLIC_API_URL` = `https://<server-url>/api` (already done in step 2).
- Sign in at the client URL with your existing admin account.

### Troubleshooting

- **Dashboard shows errors / CORS**: make sure `CLIENT_URL` on the API project is the exact
  client origin, and `NEXT_PUBLIC_API_URL` on the client is the exact `/api` URL (no trailing slash).
- **Client build fails during `/_global-error` pre-render** ("Cannot read properties of null
  (reading 'useContext')"): a known Next.js 16 framework issue on some environments. The app already
  ships a minimal `client/src/app/global-error.js` (+ `.nvmrc` pinning Node 22) as a workaround.
  If you still hit it: confirm the project Node.js Version is 22.x, and that no `NODE_ENV` value is
  set manually in the project's environment variables (Vercel sets it automatically, and an explicit
  value is the most common trigger on Next 16).
- **401 on login**: redeploy after changing `JWT_SECRET` — old tokens become invalid.
- **Timeouts**: keep default function region (`hkg1`) and duration; heavy exports may need
  Vercel's Fluid compute (default) to handle longer requests.