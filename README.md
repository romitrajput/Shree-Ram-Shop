# Shree Ram Trading Company – online store

Dry fruits store for **retail customers** and **corporate buyers (bulk with MOQ)**, with an owner admin panel, UPI QR payments and a first-party analytics dashboard. It runs as two separate environments, **Test** and **Production**, with an approval step between them.

| Area | What it does |
|---|---|
| Shop (`/`) | Home page with a live "Today's rates" board, product listing with search, sort and categories, product pages with photos, MRP/discount, reviews |
| Corporate (`/corporate`) | Bulk-rate table with MOQ per product, bulk ordering, quote request form |
| Checkout | Cart → address → order → **pay by scanning the shop's UPI QR** (amount pre-filled) → customer enters UTR → owner verifies |
| Admin (`/admin`) | Products (photos, MRP, discount %, stock, bulk price & MOQ), orders & payment verification, review moderation, corporate enquiries, shop settings (UPI ID, QR, delivery fee) |
| Analytics (`/admin`) | Visitors, revenue, conversion, funnel, traffic sources, devices, product performance, searches, busy hours, repeat customers, and plain-language **growth suggestions** |

**Stack:** Next.js 15 (App Router, Server Actions) · TypeScript · PostgreSQL 16 + Prisma · Tailwind CSS · Docker · Caddy (HTTPS) · GitHub Actions.

---

## Share it for testing with GitHub (no server)

Open the repo on GitHub → **Code → Codespaces → Create codespace**. In about 5 minutes the terminal prints a shop link and owner login you can send to the owner. Details: [docs/OWNER_TESTING.md](docs/OWNER_TESTING.md).

## 1. Run it on your computer

Needs Node 20+ and Docker.

```bash
cp .env.example .env              # then set AUTH_SECRET and ADMIN_PASSWORD
docker compose up -d              # local Postgres
npm install
npx prisma migrate deploy        # (the unpack workflow already created prisma/migrations)
npm run db:seed                   # 10 sample products + your owner login
SEED_DEMO_ANALYTICS=1 npm run db:seed   # optional: 30 days of sample traffic for the dashboard
npm run dev
```

- Shop: http://localhost:3000
- Admin: http://localhost:3000/admin (email/password from `.env`)

> The `prisma/migrations` folder must be committed. CI refuses any change to `schema.prisma` that doesn't come with a migration.

## 2. Environments

| | Test | Production |
|---|---|---|
| URL | `test.shreeramtrading.in` (password protected) | `shreeramtrading.in` |
| Branch | `develop` | `main` (moved automatically after approval) |
| Deploys | automatically on every push to `develop` | only after the owner approves in GitHub |
| Database & photos | own database and upload volume | own database and upload volume |
| Banner | red "Test environment" bar, hidden from Google | none |

The **same Docker image** that was approved in test is the one deployed to production; nothing is rebuilt in between. Details: [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md).

## 3. Put it on a server

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): one VPS (2 vCPU / 4 GB is plenty), a domain, and a GitHub repository. About an hour of setup.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – system design, data model, security, scaling path
- [docs/RELEASE_PROCESS.md](docs/RELEASE_PROCESS.md) – test → approve → production, rollbacks
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) – server setup step by step
- [docs/OWNER_GUIDE.md](docs/OWNER_GUIDE.md) – adding products, verifying UPI payments, reading the dashboard
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) – colours, type, components
- [docs/UX_REVIEW.md](docs/UX_REVIEW.md) – UX review, fixes made and recommended next features

## Tests

`npm run test:e2e` runs the Playwright tests in `e2e/` (shop and admin, phone and desktop) against a running build. CI runs them on every push with a fresh, seeded database.

## Project layout

```
src/
  app/(shop)/          customer pages: home, products, corporate, cart, checkout, order, track
  app/(shop)/actions.ts   order, payment, review and enquiry server actions
  app/admin/           login + panel: analytics, orders, products, reviews, enquiries, settings
  app/api/             track (analytics), uploads (images), health
  lib/                 db, auth, settings, storage, UPI QR, analytics queries
  components/          shared UI (header, cart, product card, forms)
prisma/                schema, migrations, seed
deploy/                server docker-compose, Caddy, deploy/backup scripts
.github/workflows/     CI and the test → production pipeline
```
