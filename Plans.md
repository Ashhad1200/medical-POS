# Plans.md — phase-by-phase execution plan

Derived from `PRODUCT_ROADMAP.md` (§5 locked decisions, §6 architecture, §7 phases, §9 test discipline).
Each task is sized to one logical unit. **Per §9, a task is not done until it has a passing automated test written in the same session.** Every multi-tenant table/endpoint additionally needs an explicit cross-org access-denial test.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done (code + tests) · `[-]` cut/deferred

---

## Phase 0 — finish what's in flight  (no new product scope)

**Objective:** land the `client → pos` migration and put schema changes on rails, so later phases build on a finished base.

**Done when:** `pos/` is the deployable POS app (`client/` removed or clearly archived), `server/db/migrations/` is the only way schema changes happen, and CI-style `npm test` passes in every package.

| # | Task | Tests required |
|---|---|---|
| 0.1 | `[x]` Reconstruct schema as real migrations `001`–`003` under `server/db/migrations/`; `npm run migrate:pg` is the single source of truth. | migration smoke via `server` globalSetup (already runs every migration on a throwaway DB) |
| 0.2 | `[x]` Port all `pos/` routes off placeholders (dashboard, ai-analytics, inventory, suppliers, orders, order-detail, purchase-orders, users, create-order, dued-customers, dealers, rtv-suggestions). | `pos/`: `format`, `accessValidity`, `AuthProvider`, `DashboardPage` render (done) |
| 0.3 | `[x]` Server test harness (Jest + supertest + throwaway `medicalpos_test` DB); `server.js` exports `app`. | 26 server tests green |
| 0.4 | `[x]` Frontend test harness (Vitest) in `pos/` / `admin/` / `landing/`. | 21 client tests green |
| 0.5 | `[x]` Remove dead MongoDB files + leaked credential from the tree. | n/a (deletion) — **user still must revoke the Atlas DB user** |
| 0.6 | `[-]` **Cutover** — deferred by user (nothing is deployed anywhere yet). Revisit when there's a deploy target. |
| 0.7 | `[~]` `medicines` create/edit form in `pos/` (dialog on the Inventory page) with the `prescription_required` toggle + Rx badge — DONE & tested (`server/tests/medicines.test.js` ×4, `pos/` inventory.test ×2). Order receipt/print + bulk-import UI still `[ ]`. | done |
| 0.8 | `[x]` Legacy `server/test-*.js` / `check-*.js` / `create-*.js` / mongo `seed*.js` moved to `server/_legacy/`; `npm run seed` → `seed-postgres.js`. | n/a |

**Dependency:** nothing. Do 0.6–0.8 before starting Phase 1.

---

## Phase 1 — Retail POS hardening + first storefront  (Category B, part 1)   `[~]` mostly done

**Objective:** one pharmacy tenant fully live with a real, OTC-only online store — cart → checkout → order → manual delivery — off the same inventory the counter uses.

**Status (2026-09-06):** built + browser-verified end-to-end. Consumer at `/store/default-medical-store` → cart (min-order enforced) → COD checkout → `SF-…` order → FEFO stock decrement → pharmacy `pos/` "Store orders" queue with rider-assign + guarded status flow. Migration `004_storefront.sql`. `84` tests across 4 packages green. Remaining: 1d.2 SSR `notFound()` view-model test, JazzCash/card payment (deferred to Phase 4 per §5), optional order-detail drill-down.

**Done when:** a pharmacy admin can flip their store live, a logged-out consumer can browse `/store/<slug>`, add OTC items to a cart, check out (COD / pay-in-store), and the pharmacy sees the order in a dashboard and can assign a rider by name/phone and move it through `placed → confirmed → out_for_delivery → delivered`. ✅

### 1a. Schema  (`server/db/migrations/004_storefront.sql`)
| # | Task | Tests required |
|---|---|---|
| 1a.1 | `[x]` `medicines.is_prescription_required boolean default false` (+ backfill `false`). | migration applies; `server/`: query test that a `true` row is excluded by the storefront listing query |
| 1a.2 | `[x]` `storefront_settings` (`organization_id` unique FK, `slug` unique, `display_name`, `logo_url`, `theme` jsonb, `delivery_fee` numeric, `delivery_radius_km` numeric, `min_order` numeric, `is_live` bool, `cod_enabled` bool, `pay_in_store_enabled` bool, timestamps). | `server/`: CRUD + `slug` uniqueness (409) + cross-org: pharmacy A cannot edit pharmacy B's settings |
| 1a.3 | `[x]` `storefront_orders` (`id`, `organization_id` FK, `order_number` unique, `customer_name/phone/address/city`, `subtotal/delivery_fee/total`, `payment_method` (`cod`\|`in_store`), `payment_status`, `status` enum `placed\|confirmed\|out_for_delivery\|delivered\|cancelled`, `rider_name`, `rider_phone`, `notes`, `placed_at`, `updated_at`). | `server/`: insert + status-transition guard (can't skip states / can't leave a terminal state) |
| 1a.4 | `[x]` `storefront_order_items` (`storefront_order_id` FK cascade, `medicine_id`, `name_snapshot`, `unit_price_snapshot`, `quantity`, `line_total`). Price/name snapshotted at order time. | `server/`: totals = sum(line_total)+delivery_fee; snapshot survives a later price change on the medicine |
| 1a.5 | `[x]` Optional: `storefront_order_events` audit (order_id, from_status, to_status, actor, note, at) — reuse the pattern from `purchase_order_status_history`. | `server/`: a transition writes exactly one event row |

### 1b. Backend  (`server/routes/storefront.js` public + `server/routes/pos-storefront.js` authed)
| # | Task | Tests required |
|---|---|---|
| 1b.1 | `[x]` `GET /api/public/storefront/:slug` — store meta + OTC catalogue (only `is_active`, in-stock, `is_prescription_required = false`), live-priced from `products`/`inventory_batches` (FEFO price, same as counter). 404 if `is_live = false` or slug unknown. | happy path; `is_live=false` → 404; a prescription item is absent from the payload; an out-of-stock item is absent |
| 1b.2 | `[x]` `POST /api/public/storefront/:slug/order` — validate cart against live stock+price server-side (never trust client prices), enforce `min_order`, create `storefront_orders` + items in a txn, decrement batch stock FEFO (reuse `orderController` allocation), return `order_number`. Rate-limited like signup. | happy path decrements stock; client-sent price is ignored (server recomputes); over-cart-quantity vs stock → 400; below `min_order` → 400; prescription item in cart → 400 |
| 1b.3 | `[x]` `GET /api/public/storefront/:slug/order/:orderNumber` — public order-status lookup (by number + phone), no auth. | returns status; wrong phone → 404 |
| 1b.4 | `[x]` `GET/PUT /api/storefront/settings` (authed, admin/manager) — read + upsert `storefront_settings` for `req.user.organization_id`; auto-suggest slug from org name with collision suffix. | upsert; slug collision suffix; **cross-org**: cannot PUT another org's settings |
| 1b.5 | `[x]` `GET /api/storefront/orders` (authed) — the pharmacy's storefront orders, filter by status, paginated, org-scoped. | org-scoping: only own org's orders; status filter |
| 1b.6 | `[x]` `PATCH /api/storefront/orders/:id` (authed) — set status (guarded transitions), set `rider_name`/`rider_phone`, cancel (restocks FEFO). | each valid transition; invalid transition → 400; cancel restocks; **cross-org** denial |
| 1b.7 | `[x]` Plan gate: storefront is a paid feature — `requireFeature('storefront')` on `GET/PUT /api/storefront/*` and reject `POST .../order` when the org's plan lacks it. Add `"storefront"` to `plans.features` for pro/enterprise in a migration. | `requireFeature` unit test already covers the mechanism; add: free-plan org → 403 on settings; basic-plan storefront order → 403 |

### 1c. Frontend — pharmacy side (`pos/`)
| # | Task | Tests required |
|---|---|---|
| 1c.1 | `[x]` `medicines` create/edit form gains an `is_prescription_required` toggle; inventory list shows an "Rx" badge. | `pos/`: form render test asserts the toggle; a mocked Rx row renders the badge |
| 1c.2 | `[x]` `pages/storefront-settings.jsx` — branding, slug (with live availability check), delivery fee/radius/min-order, `is_live` switch, payment toggles. Route `/(store settings)` admin/manager gated. | `pos/`: renders behind the role gate; a non-admin is redirected (Protected logic test) |
| 1c.3 | `[x]` `pages/storefront-orders.jsx` — order queue with status columns/filter, rider assign dialog, status-advance buttons. Route `/(storefront orders)` admin/manager/counter. | `pos/`: renders a mocked order list; the "confirm" action calls the PATCH with the right body |
| 1c.4 | `[x]` Sidebar items for the two new pages, feature-gated (hidden when plan lacks `storefront`). | `pos/`: nav filter test — item hidden without the feature flag |

### 1d. Frontend — consumer storefront (`landing/`, Next route group `app/(store)/store/[slug]/`)
| # | Task | Tests required |
|---|---|---|
| 1d.1 | `[x]` `lib/storefront.ts` — `getStore(slug)`, `placeOrder(slug, payload)`, `getOrderStatus(slug, number, phone)` (mirror `lib/api.ts`). | `landing/`: all three with `fetch` mocked — URL, method, body, error message surfacing |
| 1d.2 | `[ ]` `store/[slug]/page.tsx` — SSR store header + product grid from `getStore`. `notFound()` when the API 404s. | `landing/`: (logic only) a helper that maps API payload → view model; 404 path |
| 1d.3 | `[x]` Client cart (context or `useReducer`, `localStorage`-persisted), add/remove/qty, running subtotal + delivery fee + min-order warning. | `landing/`: cart reducer unit tests — add merges qty, remove, clear, totals, min-order boundary |
| 1d.4 | `[x]` Checkout page — name/phone/address/city, payment method, submit → `placeOrder`, success screen with `order_number` + status-lookup link. | `landing/`: checkout submit handler calls `placeOrder` with the cart; disables on invalid form |
| 1d.5 | `[x]` `store/[slug]/order/[number]` — status lookup by phone, renders the pipeline. | `landing/`: view-model mapping test |

**Done-when demo:** seed one pharmacy, mark 3 products OTC + 1 Rx, set the store live, place an order as a consumer, watch stock drop, advance it to `delivered` from the `pos/` queue. Add an e2e-ish server test that runs that whole path through the API.

**Dependencies:** Phase 0 complete. 1a before 1b; 1b before 1c/1d. 1c and 1d can run in parallel once 1b.1–1b.3 exist.

---

## Phase 2 — B2B reorder, private network  (Category A, part 1)   `[x]` done

**Objective:** digitize one real supplier↔pharmacy relationship end-to-end — supplier gets a login + catalogue + incoming-order queue; the pharmacy reorders from that supplier's live catalogue into its existing `purchase_orders`.

**Done when:** a supplier tenant logs in, publishes a catalogue with prices, and connects to a pharmacy; the pharmacy browses that catalogue, places a cart-style order that lands as a `purchase_orders` row and appears in the supplier's incoming queue; the supplier marks it fulfilled; credit terms show on `organization_ledger`.

### 2a. Schema  (`005_supplier_tenants.sql`)
| # | Task | Tests required |
|---|---|---|
| 2a.1 | `[x]` `organizations.org_type varchar default 'pharmacy'` (`pharmacy`\|`supplier`); backfill all existing to `pharmacy`. Platform signup/creation takes `orgType`. | migration; `server/`: creating a `supplier` org; a `pharmacy` login can't reach supplier-only routes |
| 2a.2 | `[x]` `supplier_connections` (`id`, `pharmacy_org_id` FK, `supplier_org_id` FK, `status` `pending\|active\|paused\|revoked`, `credit_limit`, `payment_terms_days`, `requested_by`, `approved_by`, timestamps; unique(pharmacy_org_id, supplier_org_id)). | connect request → pending → supplier approves → active; only the supplier can approve; **cross-org**: pharmacy C can't see A↔B connection |
| 2a.3 | `[x]` `supplier_products` (`id`, `supplier_org_id` FK, `name`, `generic_name`, `manufacturer`, `pack_size`, `unit_price`, `moq`, `is_active`, timestamps). Supplier's own catalogue, separate from pharmacy `products`. | CRUD; org-scoped to the supplier |
| 2a.4 | `[x]` `refactored_purchase_orders` (already exists) gains `supplier_org_id` nullable FK + `source` (`manual`\|`b2b`) so a B2B order is distinguishable from a hand-entered PO. | migration; a B2B PO carries `supplier_org_id` and `source='b2b'` |

### 2b. Backend
| # | Task | Tests required |
|---|---|---|
| 2b.1 | `[x]` Supplier RBAC: extend `middleware/auth.js` / `checkRole` with an `org_type` guard; new `requireSupplierOrg` / `requirePharmacyOrg`. | a supplier token is 403'd on pharmacy POS routes and vice-versa |
| 2b.2 | `[x]` `server/routes/supplier/catalogue.js` — supplier CRUD on `supplier_products` (+ CSV import). | CRUD happy + validation; org-scoping; cross-org denial |
| 2b.3 | `[x]` `server/routes/supplier/orders.js` — supplier's incoming-order queue (reads `refactored_purchase_orders` where `supplier_org_id = me`), accept / partially-fulfil / reject, status writes. | queue is scoped to the supplier; a pharmacy can't call these |
| 2b.4 | `[x]` `server/routes/connections.js` — pharmacy requests a connection (by supplier code/invite), supplier approves/pauses/revokes; both sides list their connections. | full lifecycle; only counterpart can approve; revoked connection blocks ordering |
| 2b.5 | `[x]` `GET /api/pharmacy/suppliers/:supplierOrgId/catalogue` — pharmacy reads a *connected* supplier's live catalogue (403 if not `active`-connected). | connected → 200; not connected → 403; paused → 403 |
| 2b.6 | `[x]` `POST /api/pharmacy/suppliers/:supplierOrgId/order` — cart → creates a `refactored_purchase_orders` (+ items) with `source='b2b'`, `supplier_org_id`, status `pending`; writes an `organization_ledger` debit against the credit line. | creates the PO; ledger row balances; over-credit-limit → 400; not connected → 403 |
| 2b.7 | `[x]` Wire the existing low-stock alert to a "reorder from <connected supplier>" action target. `GET /api/ai-analytics/insights` — each Low Stock row carries `reorder` = cheapest **active-connected** supplier stocking the SKU (matched by name / generic_name) `{supplierOrgId, supplierName, supplierProductId, unitPrice, moq}` or `null`; the alert gets `reorderableCount`. | `tests/ai-analytics.test.js` ×2 — connected supplier attaches (and an unconnected cheaper one is ignored → org-scoping); a paused connection drops the link |

### 2c. Frontend  (`pos/`, role-gated by `org_type`)
| # | Task | Tests required |
|---|---|---|
| 2c.1 | `[x]` Supplier shell: when `profile.org_type === 'supplier'`, `AppLayout` shows a supplier nav (Catalogue, Incoming orders, Connections) instead of the pharmacy nav. | `pos/`: layout renders the supplier nav for a supplier profile, pharmacy nav otherwise |
| 2c.2 | `[x]` `pages/supplier/catalogue.jsx` — list + create/edit + CSV import. | `pos/`: renders a mocked catalogue; create dialog posts the right body |
| 2c.3 | `[x]` `pages/supplier/incoming-orders.jsx` — queue + accept/fulfil/reject. | `pos/`: action buttons call the right endpoint |
| 2c.4 | `[x]` `pages/connections.jsx` (both sides) — request / approve / pause. | `pos/`: pharmacy view shows "request", supplier view shows "approve" |
| 2c.5 | `[x]` `pages/reorder.jsx` (pharmacy) — pick a connected supplier, browse catalogue, cart, submit → PO. | `pos/`: cart reducer test; submit calls the order endpoint |

**Done-when demo:** create a supplier tenant, publish 10 SKUs, connect to the seed pharmacy, place a reorder from the pharmacy, accept it on the supplier side, confirm the `purchase_orders` row + ledger entry. Server test walks that path.

**Dependencies:** Phase 1 shipped (need pharmacy tenants worth selling into). 2a → 2b → 2c. 2b.1 first (everything else needs the org-type guard).

---

## Phase 3 — network effects  (still private / invite-based)   `[x]` done

**Objective:** many-to-many pharmacy↔supplier, plus trust signals and returns handling.

| # | Task | Tests required |
|---|---|---|
| 3.1 | `[x]` Multiple active `supplier_connections` per org on both sides; reorder screen groups catalogue by supplier; a SKU search spans all connected suppliers with price compare. | `server/`: multi-connection listing scoped correctly; `pos/`: price-compare view-model test |
| 3.2 | `[x]` Returns / near-expiry between pharmacy & supplier: `supplier_returns` table (links a `purchase_order_item` + batch, reason `near_expiry\|damaged\|wrong_item`, status). Pharmacy raises, supplier accepts/rejects, stock + ledger adjust. | full lifecycle; ledger credit on accept; **cross-org** |
| 3.3 | `[x]` Fill-rate / reliability metric per connection: computed from PO history (`ordered_qty` vs `fulfilled_qty`, on-time %). Read-only endpoint + a badge on the supplier picker. | `server/`: metric math on seeded PO history (0%, 100%, partial); handles zero-history |
| 3.4 | `[x]` Supplier-side analytics: top pharmacies, revenue, fill-rate trend (reuse the `ai-analytics` shape). | `server/`: aggregates are supplier-org-scoped |

**Dependencies:** Phase 2 live with ≥1 real supplier. Do not start before then.

---

## Phase 4 — delivery & payments maturity, then marketplace opening

**Status (2026-09-06):** 4.1 + 4.2 shipped. 84 server tests green.
- **4.1 courier** — `server/services/courier/{index,manual,postex}.js`, migration `007_courier.sql` (`storefront_orders.courier / courier_ref / courier_status_raw`). Assign folded into `PATCH /api/storefront/orders/:id` (`{courier}`); public `POST /api/public/storefront/courier/webhook/:courier` maps external→internal (`out_for_delivery`/`delivered`/`cancelled`, courier-authoritative on delivery progress, restocks on cancel), quarantines unmapped statuses (202, raw kept).
- **4.2 payments** — `server/services/payment/{index,manual,jazzcash}.js`, migration `008_payments.sql` (`storefront_settings.online_enabled`; `storefront_orders.payment_provider / payment_ref`; `payment_method` gains `online`). `placeOrder` with `paymentMethod:'online'` inits the charge (JazzCash Page-Redirection, HMAC-SHA256 secure hash, no S2S call) and returns `payment:{provider,ref,redirectUrl,fields}`; order is created `payment_status='unpaid'`. Public `POST /api/public/storefront/payment/webhook/:provider` verifies the signature → flips `payment_status` to `paid`/`failed` (idempotent, never downgrades `paid`). `updateOrder` blocks any forward transition except `cancelled` while an `online` order is unpaid (`PAYMENT_REQUIRED`). Provider chosen by `STOREFRONT_PAYMENT_PROVIDER` env (default `jazzcash`). **ponytail:** online orders still decrement stock at placement — unpaid abandoned carts are freed by the pharmacy cancelling (restocks); reserve-then-commit deferred.
- **4.2 frontend** — `pos/` storefront-settings has an "Accept online payment (JazzCash)" switch (`online_enabled`); `landing/` store: `Store.onlineEnabled`, a "Pay online" checkout option, and `redirectToGateway()` which POST-submits the signed `payment.fields` to `payment.redirectUrl`.
- **4.2 return leg** — the payment webhook doubles as the gateway return URL: a form-encoded (browser) hit is 302'd to `${STOREFRONT_PUBLIC_URL}/store/<slug>/order/<num>?phone=<phone>`; a JSON hit still gets JSON. `jazzcash` adapter defaults `pp_ReturnURL` to `${STOREFRONT_API_URL}/api/public/storefront/payment/webhook/jazzcash` (operator override via `JAZZCASH_RETURN_URL`). The consumer order page auto-looks-up from `?phone=` and shows a "Payment received" banner. `tests/payment.test.js` ×15. No `pos/` courier-picker UI (manual rider dialog already covers 4.1's non-integrated path; PostEx has no config in dev).

| # | Task | Tests required |
|---|---|---|
| 4.1 | `[x]` Courier adapter interface (`server/services/courier/*`) behind `storefront_orders` — `assignCourier(order)`, `getStatus(ref)`, webhook receiver that maps external → internal status. Ship with a `ManualCourier` (current behaviour) + one real adapter (PostEx or Bykea for PK). | `server/`: adapter contract test with a fake courier; webhook maps each external status; unknown status is quarantined not crashed — **`tests/courier.test.js` ×11 green** |
| 4.2 | `[x]` Online payments: JazzCash/EasyPaisa (PK) or Stripe adapter behind `payment_method`; `payment_status` webhook; storefront order stays `placed` until paid when method ≠ COD. | `server/`: payment webhook flips `payment_status`; an unpaid non-COD order isn't fulfillable — **`tests/payment.test.js` ×13 green** |
| 4.3 | `[ ]` Marketplace opening (gated on real two-sided volume): supplier discovery directory, DRAP license capture on supplier onboarding, ratings, connection requests from search. | `server/`: a supplier only appears in discovery once `verified`; rating aggregation |
| 4.4 | `[ ]` `PRODUCT_ROADMAP.md §7a` (supplier↔supplier network) — **only scope this after 4.3**, and re-plan it as its own phase then. | — |

**Dependencies:** Phases 1–3 all live. §8 risk notes apply hard here — resist pulling 4.3/4.4 forward.

---

## Cross-cutting (every phase)

- **Tests are the definition of done** (§9). No phase task above is checked `[x]` without its test row passing.
- Every new table → at least one multi-tenant scoping test (cross-org denial).
- Every new migration is `IF NOT EXISTS` / idempotent and re-runs clean in `globalSetup`.
- Keep in-store `orders` and `storefront_orders` separate; join only by `medicine_id` + `organization_id`.
- Supplier tenants never get a storefront/cart. Storefront is Category-B-only (§6).
- Update this file's checkboxes as work lands; add a dated note when a phase ships or scope is locked.

## Open question for the user

You mentioned adding an MCP "for prompts" — it isn't showing as a connected server in this session (connected MCP: arcads, Exa, Indeed, higgsfield, mempalace, claude-in-chrome). Tell me its name, or restart the session so it loads, and I'll fold it into how these phases get executed.
