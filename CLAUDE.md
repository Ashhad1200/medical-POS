# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

Independent npm packages, no workspace tooling:

- `client/` — React 18 + Vite 4 + Tailwind 3 SPA (the ORIGINAL POS front end; being replaced by `pos/`, kept as reference during the port)
- `pos/` — React 19 + Vite 7 + Tailwind 4 SPA (the POS front end, rewrite on the Metronic stack; ready to replace `client/`). All routes ported & browser-verified: dashboard, inventory, suppliers, orders, order-detail, purchase-orders, users, create-order (full checkout, FEFO stock decrement), dued-customers, dealers, rtv-suggestions. Only the AI analytics dashboards are still unported (optional). `src/lib/services.js` mirrors `client/src/services/api.js`. Dev port 5175, `.npmrc` legacy-peer-deps.
- `server/` — Express REST API on PostgreSQL (`pg`, raw SQL — no ORM)
- `admin/` — React 19 + Vite 7 + Tailwind 4 SPA (SaaS operator back office). Vendored from the Metronic v9 React starter, demo layouts stripped, `src/components/ui/*` kept. Talks to `/api/platform/*`. Dev port 5174, `.npmrc` pins `legacy-peer-deps=true`. Log in with the `seed:platform` operator account.
- `landing/` — Next 15 + React 19 + Tailwind 4 marketing site. Vendored from the Metronic v9 Next.js `saas` landing kit. `components/pricing.tsx` is data-driven from `GET /api/public/plans`; `/signup` posts to `POST /api/public/signup` then sends the new tenant to the POS app. Dev port 3007, `.npmrc` pins `legacy-peer-deps=true`. Marketing copy outside hero/header/pricing is still the template's generic text.

Root holds deploy configs only (`railway.json`, `nixpacks.toml`, `Procfile`s, `deploy-railway.sh`, `RAILWAY_DEPLOYMENT.md`). `db.txt` is the authoritative Postgres schema dump (Prisma-managed externally; not runnable).

`PRODUCT_ROADMAP.md` — market analysis and phased plan for the two-category expansion (Category A: supplier/distributor system; Category B: retail POS + per-pharmacy storefront with cart/checkout/delivery). Read this before starting any new feature work toward that direction; it also records which scope decisions (marketplace shape, storefront scope, delivery approach, build order) are already locked in for v1 so they aren't re-litigated per-task.

## Commands

```bash
# server/  (dev server needs a running Postgres + a .env — see server/.env.example)
npm run dev            # nodemon server.js
npm start              # node server.js
npm run seed           # scripts/seed.js
npm run migrate:pg     # scripts/run-migrations.js  (see migration note below)

# client/
npm run dev            # vite (port 5173, proxies /api -> localhost:4001)
npm run build          # vite build -> dist/
npm run lint           # eslint, --max-warnings 0
npm run preview
```

There are **no automated tests** despite `npm test` (jest/vitest) being configured — no `*.test.js` / `*.spec.js` files exist. The `server/test-*.js` and `server/check-*.js` / `server/create-*.js` files are one-off scripts run manually with `node` against a live server/DB; don't treat them as a suite.

**This changes starting now.** Binding rule for all new work (see `PRODUCT_ROADMAP.md` §9 for the full version): every logical unit — one controller action/endpoint, one model method, one non-trivial hook/component, one utility function — ships with a passing automated test in the same session it's written in, not as a follow-up task. This project is moving from a 2-client build to a multi-version product aimed at a large market; untested code compounds risk across versions in a way it didn't at 2-client scale. A phase from `PRODUCT_ROADMAP.md` is not "done" without tests, regardless of who (including a Claude Code session) implemented it.

## Server architecture

Request flow: `routes/*.js` → `controllers/*.js` → optionally `models/*.js` → `config/database.js`.

- **`config/database.js`** exports `query(text, params)` and `withTransaction(cb)`. Every DB access goes through these. Uses `DATABASE_URL` if set (Heroku/Railway), else discrete `POSTGRES_*` vars.
- **"Refactored" duplicates are the live ones.** `server.js` wires `routes/refactoredSuppliers` and `routes/refactoredPurchaseOrders` (backed by `refactored*Controller.js` + the class-based `models/Refactored*.js`). The plain `supplierController.js` / `purchaseOrderController.js` / `routes/suppliers.js` / `routes/purchaseOrders.js` still exist but are **not mounted** — don't edit them expecting effect.
- **`models/Refactored*.js`** are active-record-style classes: constructor normalizes both `snake_case` (DB rows) and `camelCase` (API input), instance `save()/delete()` methods, static finders. Other resources have no model layer — controllers call `query()` directly.
- **Multi-tenant:** almost every table has `organization_id`. Always scope queries by `req.user.organization_id`. Cross-org data leakage is the main correctness risk here.
- **Auth (`middleware/auth.js`):** `auth` verifies the JWT, then re-loads the user + org on every request and enforces a **single active session** — the JWT carries a `sessionToken` that must equal `users.session_token` (login rotates it, logout nulls it). Also blocks deactivated users, deactivated orgs, and expired `organizations.access_valid_till`.
- **RBAC:** `checkRole([...])` checks `req.user.role_in_pos` (values: `admin`, `manager`, `counter`, `warehouse`). Applied per-route, often `router.use(checkRole(...))` then tighter `checkRole` on mutating routes.
- **Response envelope:** `{ success: boolean, data?, message?, pagination? }`. Controllers use `asyncHandler` + `createSuccessResponse` / `createErrorResponse` from `utils/errors.js` (`AppError` subclasses carry `statusCode`/`code`). `server.js` has a global handler mapping Postgres error codes (`23505`, `23503`, …) to 400s.
- Security stack in `server.js`: helmet + CSP, `express-rate-limit` (global `/api/`, looser `/api/auth/login`), custom `middleware/securityHeaders.js` response sanitizers. CORS allowlist is regex-based for `*.vercel.app`/`*.railway`/`*.onrender`/`*.herokuapp` + localhost.
- `JWT_SECRET` is mandatory — `authController.js` calls `process.exit(1)` if it's missing.

**Platform (SaaS operator) layer** — separate from the tenant app:
- `middleware/platformAuth.js` gates `/api/platform/*` and `/api/admin/*` — requires a JWT whose user has `users.is_platform_admin = true`. Not org-scoped. A tenant `role_in_pos='admin'` is **not** a platform admin.
- `controllers/platformController.js` + `routes/platform.js`: overview, health, `plans` CRUD, cross-tenant organization management (provision org+admin in a txn, change plan, set access window, suspend/reactivate — suspend nulls every member's `session_token`), cross-tenant user list / status / session revoke, audit-log reader.
- `plans` table (migration `002`) + `organizations.plan_id / plan_status / plan_current_period_end`. `middleware/planLimits.js`: `enforceUserLimit` (on `routes/users.js` POST) and `requireFeature("<flag>")` read `plans.features` jsonb.
- Seed the operator with `npm run seed:platform` (`owner@medicalpos.local` / `owner123`, lives in a hidden `__platform__` org). `npm run setup:local` = migrate + seed:pg + seed:platform.

**Public onboarding** — `controllers/publicController.js` + `routes/public.js` at `/api/public` (no auth): `GET /plans` (public plans for the marketing site) and `POST /signup` (self-serve — creates org + admin + trial from a `planCode`, auto-slugs the org code, returns a JWT, writes a `subscription_events` 'created' row). `POST /api/public/signup` is rate-limited to 10/hour/IP in `server.js`.

## Client architecture

- **`services/api.js`** — single axios instance. Request interceptor attaches `localStorage.token`; response interceptor clears the token and hard-redirects to `/login` on 401. All API calls go through the exported `*Services` objects here.
- **Auth state:** `contexts/AuthContext.jsx` wraps `hooks/useAuth`; consume via `useAuthContext()` (`profile`, `isAuthenticated`, `initialized`, `isAccessValid`, …). Route guarding is `<ProtectedRoute requiredRoles={[...]}>` in `App.jsx`, checking `profile.role_in_pos`.
- **State:** Redux Toolkit (`store/slices/`: auth, medicine, order) for client state; TanStack Query (`@tanstack/react-query`) for server state. Both `react-query` v3 and `@tanstack/react-query` v5 are installed — new code uses v5.
- **`config/constants.js`** centralizes API/auth/query/pagination config and enums (`ORDER_STATUS`, `PURCHASE_ORDER_STATUS`, `ROLE_HIERARCHY`, …). Reuse these enums rather than string literals.
- Tailwind for styling; `react-hot-toast` for notifications; charts via both `chart.js`/`react-chartjs-2` and `recharts`.

## Gotchas

- **`server/index.js` is dead code** — a stale MongoDB/mongoose entry point. The real entry is `server/server.js` (PostgreSQL). Ignore `index.js`; the README's mentions of SQLite/Supabase-Auth/`pos-admin-panel` are also outdated.
- **Port config is inconsistent across the repo.** Server defaults to `PORT || 3001`; Vite dev proxy and `client/src/config/constants.js` default to `4001`; `client/.env.example` says `3001`; some `test-*.js` scripts hardcode `4000`. Set `VITE_API_URL` explicitly and match the server's actual port.
- **`npm run migrate:pg` reads `server/db/migrations/*.sql`, which doesn't exist** (it warns and exits). Schema changes have historically been ad-hoc `server/scripts/*.js` / `*.sql` run by hand, plus Prisma migrations applied from outside this repo. Check `db.txt` for current schema; add real migrations under `server/db/migrations/` if you want `migrate:pg` to do anything.
- Batch/FEFO inventory, AI analytics, RTV suggestions, and dued-customers are recent additions (`aiAnalyticsController.js`, `routes/aiAnalytics.js`, client `NewAIDashboard`/`RTVSuggestionsPage`/`DuedCustomersPage`).
