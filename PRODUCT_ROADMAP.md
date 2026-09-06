# Medical POS — Market Analysis & Product Roadmap
**Two-sided vision: Supplier (distributor) system + Retail (pharmacy) system with per-pharmacy storefront & delivery**
Last updated: 2026-09-06 (v1.3 — added Phase 5: dual-role accounts) · Owner: Ashhad / BD Matrix

---

## 0. What this document is

This is the working plan for turning the current single-tenant-style pharmacy POS into a two-category platform:

- **Category A — Supplier system**: for a "total supplier" (a distributor of medicines *and* medical equipment) to manage catalog, pricing, incoming orders, credit, and fulfillment to retail pharmacies.
- **Category B — Retail system**: the existing pharmacy POS, extended with (1) a B2B reorder screen that talks to Category-A suppliers, and (2) a **public storefront** per pharmacy — same inventory and prices the pharmacy enters for its physical counter, exposed as a branded online shop with cart, checkout, and delivery tracking.

Decisions already locked in for v1 (see §5) came out of a strategy discussion on 2026-09-05 and should not be re-litigated without a reason — they trade some ambition for a much higher chance of actually shipping, given this is currently a 2-client, early-stage product.

This will ship as **multiple versions, not one release** — expect this document to keep growing a new dated section each time scope is locked in or a phase ships. §5's v1 decisions are scoped to the *current* version only, not a permanent ceiling; §7a below is the first example of a bigger idea being captured for a later version on purpose, instead of pulled into v1.

---

## 1. Where the product actually stands today

Read directly from the codebase (`CLAUDE.md`, `db.txt`, `README.md`) as of this writing:

- Real, working multi-tenant architecture: `organizations` table with plan/billing fields, `users` scoped by `organization_id`, RBAC (`admin` / `manager` / `counter` / `warehouse`), single-active-session auth.
- POS core: sales, batch/FEFO inventory, customers, orders, AI analytics, RTV suggestions, dued-customers — all real and recent.
- A separate **platform/admin layer** (`/api/platform/*`) already manages tenant orgs, plans, and self-serve signup (`landing` → `POST /api/public/signup`) — i.e., the SaaS operator scaffolding for onboarding new pharmacy tenants already exists.
- `suppliers` is **just a contact record** (name, phone, address, credit_limit/current_balance) scoped to one pharmacy org — not a system, not a login, not a catalog. `purchase_orders` are entered by the pharmacy manually against that contact. There is no supplier-side portal at all.
- No storefront, no cart, no checkout, no delivery tables/module of any kind exist yet.
- Two frontends mid-migration (`client` → `pos`), which matters for sequencing — see §7.

**Honest read:** the multi-tenant/RBAC/billing foundation is more modern than most of what's sold in Pakistan today (which is mostly generic retail POS repainted for FBR e-invoicing compliance). But on the two things that would actually differentiate it globally — live multi-supplier ordering and a real consumer storefront — it is currently at feature parity with nothing; it hasn't started. Current market differentiation: **~4/10**. The vision below, if built in the right order, is a genuine **~8/10** opportunity — see §3 for why, and §8 for why it isn't a 10.

---

## 2. Market landscape

### 2.1 Global pharmacy POS / pharmacy management software
- Incumbents (PioneerRx/RedSail, BestRx, QS/1, McKesson EnterpriseRx, Rx30, Liberty Software) are dispensing-centric, US-focused, and require stitching together separate POS/EHR/e-commerce vendors — effective cost climbs to $900–$2,700+/month once add-ons are counted. Sector-wide criticism: vendor lock-in, proprietary architectures that resist integration, dated UI on legacy platforms, painful data migration.
- Cheap generic retail POS (Loyverse/Square/Foodics-style) gets recommended for small/emerging-market pharmacies but has none of the pharmacy-specific machinery (batch/expiry, controlled-substance handling).
- Market sized at roughly **$116B (2026) → $236B (2031), ~15% CAGR** (directional — estimates vary a lot by research firm). Cloud deployment is already >60% share and growing fastest.

### 2.2 B2B ordering (distributor ↔ pharmacy) — the core of Category A
- **Mature only in two pockets**: (a) the US 3-wholesaler oligopoly (McKesson Connect, Cardinal Health Order Express) via decades-old EDI — but these are single-wholesaler-owned portals, not neutral multi-supplier tools; (b) funded urban-metro startups in India/SE Asia (**Retailio**, **Saveo**, **SwipeRx**, Zuellig's **eZRx+**) — genuine multi-supplier marketplaces, but **standalone apps, not built into the pharmacy's own POS/stock system**.
- The one place anyone has bundled POS + supplier ordering is Africa's **Maisha Meds** (free POS that also negotiates wholesale pricing and coordinates delivery) — proof of concept that the bundle is valuable, at very small scale.
- Recurring unsolved problems everywhere outside those pockets: credit/payment terms (informal credit is the norm, hard to underwrite), returns/near-expiry handling, delivery in smaller towns, and basic stock/fill-rate trust (Retailio markets a "99.99% fill-rate guarantee" precisely *because* that's normally unreliable).
- Signal worth noting: **Saveo divested its own pharma-distribution arm to CureBay in 2025/26** — a hint that pure-marketplace unit economics in B2B pharma are hard to sustain standalone; bundling (POS-embedded, or vendor-managed-inventory like mPharma) looks structurally healthier than a pure marketplace.

### 2.3 Consumer storefront + delivery per pharmacy — the core of Category B's new piece
- Pharmacy-specific white-label attempts (**RxLocal**, **DigitalRx**) are **refill-request tools, not cart-and-checkout storefronts** synced to live pricing/stock. Nobody in this niche has cleanly solved a real e-commerce layer per independent pharmacy.
- **TinyRx** (SF, ~2015) is the direct cautionary tale: storefront + *owned delivery fleet* for independent pharmacies. Raised ~$5M, never scaled past 3 cities, and is dead.
- The vendors that *did* solve storefront-sync well (**Toast**, **Shopify POS**, **Square**, **Clover**) share one trait: POS and storefront run off **one shared database**, so sync is instant by construction, not a background job. Every one of them **outsources delivery** to courier APIs (DoorDash Drive, Uber Direct) rather than owning a fleet. Pharmacy-specific delivery infrastructure exists as a pluggable layer too (**ScriptDrop** — routes prescriptions to a vetted, compliant courier network; used by thousands of pharmacies/health systems in the US).
- Real, non-hypothetical failure modes: inventory-sync lag/"phantom stock" is a common complaint pattern in multichannel retail generally; pharmacy adds *prescription verification*, *controlled-substance rules*, and *cross-jurisdiction licensing* on top of that — problems plain e-commerce sync never had to solve.

### 2.4 Pakistan specifically
- Independent pharmacies/medical stores are largely undigitized — cash registers, paper ledgers, WhatsApp-based ordering. (One widely cited figure: ~95% of Pakistani pharmacies operate without a licensed pharmacist — take as illustrative of informality, not a precise stat.)
- Local pharmacy-POS vendors (OneClickPOS, Switcher Techno, Muhasib, Sadah Hisab, Moneypex, Bilytica, Asaan POS) are mostly generic retail POS repackaged around the **FBR 2025 e-invoicing mandate**, which explicitly covers pharmacies/medical stores — this is the real near-term forcing function pushing retail-side adoption, independent of anything pharmacy-specific. **Marg Pakistan** is the closest existing product to a real pharmacy+distributor stack (batch/expiry, FBR integration, e-Retail ordering app).
- Wholesale distribution is still overwhelmingly **phone / WhatsApp / in-person "order booker"** driven. **Adviyat.com.pk** is the one identifiable domestic B2B pharma wholesale marketplace (DRAP-verified sellers, RFQ/bulk ordering) but its real scale is unverified.
- Consumer online-pharmacy activity exists but isn't the same shape as this plan: **Dawaai.pk** (funded ~$10.5M total, real traction) and **DVAGO** both run their *own* retail/marketplace inventory rather than giving independent pharmacies a white-label storefront on their own stock. **oladoc**/**Sehat.com.pk** bolt medicine ordering onto telehealth.
- DRAP (drug licensing) and FBR (tax/POS invoicing) are two separate, non-integrated compliance tracks — no unified e-pharmacy licensing regime exists yet, so most "online pharmacies" here currently operate in a defined grey zone rather than a clearly regulated one.

---

## 3. The market gap, stated plainly

No product found anywhere — outside a US EDI stack locked to 3 wholesalers, and a couple of small African pilots — does all three of these on **one shared data layer**:

1. Pharmacy POS / inventory (solved, everywhere, by many vendors)
2. Native, distributor-agnostic B2B reordering triggered by the pharmacy's own real stock levels (solved only in fragments — single-supplier lock-in *or* a separate standalone marketplace app)
3. A true cart-and-checkout consumer storefront for that specific pharmacy, synced live to the same prices/stock (essentially unsolved in this vertical — existing "white-label" tools are refill-request-only)

That three-way unification — one inventory row simultaneously driving the counter sale, the supplier reorder trigger, and the online listing — is the actual product gap. It is a *global* gap, not a Pakistan-only one; Pakistan is simply one of the more extreme (and most immediately reachable, for Ashhad) examples of an underserved market.

---

## 4. USP

**Today, honestly:** "A modern multi-tenant SaaS pharmacy POS." True, but not differentiated — dozens of vendors can say the same thing, and several already do in Pakistan specifically around FBR compliance.

**Target USP, once Category A + B are live:** *"The only pharmacy platform where one inventory record drives the counter sale, the supplier reorder, and the online store — so a pharmacy never re-keys the same medicine into three different systems, and never runs out of stock because its supplier ordering was a separate app nobody checked."*

Secondary, more tactical USPs that fall out of the research and are worth using in messaging once true:
- Distributor-agnostic (unlike McKesson Connect / Zuellig eZRx+, which lock a pharmacy to one supplier's own portal).
- Built into the POS the pharmacy already uses daily (unlike Retailio/Saveo/SwipeRx, which are separate apps a pharmacy has to remember to open).
- Delivery via pluggable courier integration, not an owned fleet — cheaper to run and avoids the TinyRx failure mode.
- FBR e-invoicing compliant out of the box for the Pakistan market (a real, immediate switching trigger for local pharmacies right now).

---

## 4a. Growth philosophy — retention over extraction

Explicit product principle, not just a nice sentiment — it should actually change pricing and support decisions, not sit in a values statement nobody reads:

**The growth model is happy customers spreading the product, not contract terms trapping them in it.** Concretely, that means:
- No punitive lock-in: month-to-month should be a genuinely fine way to use this, not a worse tier designed to push people into annual contracts. If the product is good, pharmacies stay because leaving is a downgrade, not because leaving is contractually painful.
- The pharmacy's *own customers* being happy is a growth input for us, not just for them. This is the direct reason the storefront (§7 Phase 1) is being built with real self-serve customization (banners, deals, featured products — see the update below) rather than a bare product listing: a pharmacy that can run its own "Wellness Week" promotion and make its own customers happy has a reason to tell other pharmacy owners about the platform. A happy pharmacist is the sales channel.
- Support and reliability get weighted accordingly — the research in §2.1 flags "support disappearance post-sale" as a recurring complaint about incumbent pharmacy software; that's specifically the failure mode this principle is meant to prevent, not a generic aspiration.
- Practical effect on §5's decisions and on any future pricing work: prefer transparent, simple pricing over hidden fees or aggressive upsells; prefer fixing a bad experience over contractually preventing a customer from leaving over it.

This doesn't mean underpricing the product or avoiding hard business decisions — it means the growth engine this roadmap is betting on is word-of-mouth from genuinely satisfied pharmacy owners, so decisions that would win a customer short-term while making them resentful long-term should be treated as a cost, not a win.

---

## 5. Decisions locked in for v1 (2026-09-05)

These were decided explicitly to keep scope shippable for a 2-client, early-stage product, and should be treated as binding unless revisited on purpose:

| Question | Decision |
|---|---|
| Marketplace shape | **Private network first.** Each pharmacy tenant only orders from suppliers it's explicitly connected to. No open "any supplier ↔ any pharmacy" marketplace yet — that's a Phase 3+ idea once there's real volume on both sides to justify the trust/verification work it needs. |
| Storefront scope | **OTC / general medical items only in v1.** No prescription upload, no controlled-substance sales through the storefront. Keeps the first release out of the regulatory grey zone entirely. |
| Delivery | **Manual/own-rider assignment first.** The pharmacy (or its staff) manually assigns a rider/courier per order inside the app. No courier-API integration in v1 — that's a Phase 4 add-on once order volume justifies it. |
| Build order | **Retail POS + storefront before the supplier platform.** Builds on the product and clients that already exist; the supplier side is a two-sided cold-start problem that's much easier to solve once there's a base of pharmacy tenants worth selling into. |
| Storefront customization (added 2026-09-06) | **Self-serve, structurally inspired by DVAGO.pk** (deals carousel, category quick-links, themed banners — see §7 Phase 1 and the mockup linked there) **but a distinct, white-label visual identity per tenant** — own logo, own brand color, own banners/offers. Never DVAGO's actual branding/colors; each pharmacy is clearly its own store, not a reskin of a named competitor. |

---

## 6. Architecture, grounded in the existing repo

No rewrite needed — this extends the current schema and module layout.

**For the avoidance of doubt:** the public storefront, cart, and checkout are a **Category B (retail medical store) feature only.** Category A (supplier) tenants get a portal — catalog, pricing, incoming-order queue, fulfillment — and nothing consumer-facing. A supplier never gets a public storefront or a cart; only the medical store selling to end consumers does.

**Schema additions (new migrations under `server/db/migrations/`, which currently doesn't exist as a real directory — see Gotchas in `CLAUDE.md` — this is the moment to actually start it properly):**
- `organizations.org_type` (`pharmacy` | `supplier`) — the only structural change needed to let a supplier become a first-class tenant instead of a contact record.
- `supplier_connections` (pharmacy_org_id, supplier_org_id, status, credit_terms) — replaces the informal `suppliers` contact record with a real two-tenant link once a supplier has its own org; keep the existing `suppliers` table for pharmacies that haven't onboarded a real supplier tenant yet (both can coexist).
- `storefront_settings` per pharmacy org (slug, branding, delivery radius/fee, is_live).
- `storefront_orders` + `storefront_order_items` (separate from internal `orders`/`order_items` so in-store POS sales and online orders stay cleanly distinguishable, joinable by `medicine_id`/`organization_id`), with a status pipeline: `placed → confirmed → out_for_delivery → delivered → cancelled`.
- `medicines.is_prescription_required` flag (already implied by pharmacy domain knowledge, not yet in schema per `db.txt`) — used to hide gated items from the v1 OTC-only storefront automatically.
- Reuse `organization_ledger` for supplier credit/AR tracking rather than building new financial tables — it already exists for exactly this shape of problem.

**Module placement:**
- Supplier portal (Category A): new routes under `server/routes/supplier/*` + controllers, reusing the existing `auth`/RBAC middleware pattern with a new role scope for `org_type = supplier`. Frontend: either a new lightweight app or, faster, a role-gated section inside `pos/` (it's already the newer, actively-developed shell) rather than standing up a fifth SPA.
- B2B reorder screen (Category B addition): lives inside `pos/`, calls the new supplier-catalog endpoints, and on submit creates a row in the *existing* `purchase_orders`/`purchase_order_items` tables — so this is additive to code that already works, not a replacement.
- Storefront (Category B addition): public, unauthenticated pages. `landing` is already Next.js and already serves public marketing pages driven by the API (`GET /api/public/plans` pattern) — the cleanest fit is a `/store/[org-slug]` route inside `landing` reading from a new `GET /api/public/storefront/:slug` endpoint, rather than a sixth app. Cart/checkout state can be client-side (no login required for OTC purchase) posting to `POST /api/public/storefront/:slug/order`.
- Delivery: v1 is just a status field + manual rider name/phone on the order — no integration work. Structure the `storefront_orders` status/webhook fields so a courier API (PostEx/Bykea/Trax for Pakistan; Shipday/Uber Direct/ScriptDrop-style for other markets) can be dropped in later without a schema change.

---

## 7. Phased roadmap

**Phase 0 — finish what's already in flight (before adding new scope)**
- Complete the `client` → `pos` port (per `CLAUDE.md`, most `pos` pages are still placeholders). Shipping new B2B/storefront features on top of an unfinished port doubles the maintenance surface.
- Add real migrations under `server/db/migrations/` (currently a stub) so schema changes from this point on are tracked, not ad hoc.

**Phase 1 — Retail POS hardening + first storefront (Category B, part 1)**
- `medicines.is_prescription_required` flag + admin UI to set it.
- `storefront_settings` + a minimal public store page per pharmacy (`landing/store/[slug]`) listing only OTC items, live-priced from the same `medicines`/`user_inventory` data the counter uses.
- **Self-serve storefront customization**, so a pharmacy owner never needs a developer to run a promotion: `storefront_banners` (image/gradient, headline, CTA, start/end date, active toggle — a small ordered list, not a full CMS), `storefront_deals` (medicine_id, discount %, start/end date, active toggle — surfaces on a "Today's Deals" carousel), `storefront_featured_products` (a short curated list for the homepage), plus `theme_accent_color` and a logo upload on `storefront_settings`. All of it editable from inside the pharmacy's existing dashboard (a new "Storefront" section, not a separate app). See mockup: [Pharmacy Storefront Customization](https://claude.ai/code/artifact/81874c3c-4826-4913-8980-437152be4464) — shows the owner-side customization panel next to the resulting customer-facing store; DVAGO.pk's layout conventions (deals carousel, category quick-links, themed banners) were used as structural reference, but the visual identity is a distinct, generic white-label template — each tenant supplies its own name, logo, and brand color, never DVAGO's.
- Cart → checkout → `storefront_orders` (payment: cash-on-delivery / in-store pay to start; add JazzCash/EasyPaisa or card processing once there's real order volume).
- Manual delivery assignment inside the pharmacy's order dashboard (rider name/phone/status only — no API yet).
- **Goal:** one pharmacy tenant fully live with a real online store — including running its own banner/deal — end to end, before touching Category A at all.

**Phase 2 — B2B reorder, private network (Category A, part 1)**
- `organizations.org_type = supplier`, `supplier_connections` table, supplier-side login/portal (catalog + incoming-order queue) inside `pos/` under a supplier role.
- **Forward-compatibility note (for Phase 5, don't build yet):** store `organizations.org_type` as a small list/array of roles (e.g. `["pharmacy"]` or `["supplier"]`) rather than a single fixed value. Costs almost nothing to do now, while this table is first being built; avoids a rework across Phases 2–4 later if dual-role accounts (Phase 5) turn out to be needed. Don't build the dual-role feature itself now — just don't paint the schema into a corner.
- Pharmacy-side reorder screen: browse a connected supplier's live catalog/pricing, cart-style order that writes into `purchase_orders`.
- Low-stock alerts (already exist) get a "reorder from [supplier]" action wired to this screen.
- Credit terms via `organization_ledger`.
- **Goal:** at least one real supplier relationship digitized end-to-end for one pharmacy client, replacing a phone/WhatsApp order with the app.

**Phase 3 — network effects**
- Multiple suppliers per pharmacy, multiple pharmacies per supplier — still private-network (invite/connect-based), not an open marketplace yet.
- Returns/near-expiry handling between pharmacy and supplier (data already tracked for batch/FEFO on the pharmacy side — extend to supplier side).
- Fill-rate / reliability metrics per supplier connection (a trust signal, echoing Retailio's guarantee) — cheap to add once order history exists.

**Phase 4 — delivery & payments maturity, and only then, marketplace opening**
- Pluggable courier API layer (PostEx/Bykea/Trax for Pakistan; Shipday/Onfleet/Uber Direct elsewhere) behind the existing `storefront_orders` status field.
- Online payment methods beyond COD.
- Only once there's enough tenant volume on both sides: revisit opening the supplier network from private to a discoverable marketplace, with the verification/trust tooling that requires (DRAP license capture, ratings, fill-rate guarantees).

**Phase 5 — Dual-role accounts: one login for a business that is both (added 2026-09-06, deliberately last)**

Real case this covers: a business that is simultaneously a supplier/distributor *and* runs its own retail medical store — one login, one account, with access to both the supplier portal (Category A) and the retail POS + storefront (Category B), instead of two separate signups.

**Do not start this before Phase 4 is complete.** It's a real scenario, but narrower than the two core categories — most suppliers are pure wholesalers and most pharmacies are pure retail; a business that's genuinely both is the exception. Building for it before the core two-category product is proven would be solving an edge case ahead of the main case.

Three ways to build it, ranked, when the time actually comes:

1. **One account, two roles (recommended).** A single organization can carry both roles at once (this is exactly what Phase 2's forward-compatibility note above protects) — one login, one dashboard, both the Storefront/POS section and the Supplier Portal section in the same navigation. The closest match to "a single user that [has] both of the panel."
2. **Linked organizations with a switcher.** Keep two separate org records (a pharmacy org and a supplier org) linked by "owned by the same person," with a workspace switcher, similar to switching Google accounts. No change needed to how `org_type`/roles work elsewhere; more isolated, but the experience is switching rather than one unified view.
3. **Two unlinked accounts.** No engineering work at all — the same person just signs up twice. Available today. Not what was asked for (it's genuinely two logins), but the cheapest fallback if Phase 5 never gets prioritized.

**Honest cost of doing this last:** close to zero, on the condition that Phase 2's forward-compatibility note above is actually followed. If it is, Phase 5 is mostly UI work (a combined dashboard/nav for orgs with both roles) rather than a data-model change. If it's skipped, Phase 5 starts with an audit of every place in Phases 2–4 that assumed an org is either a supplier or a pharmacy, never both, and fixing each one — real rework, but not a rewrite.

---

## 7a. Future version — cross-supplier network (flagged now, not scheduled)

Ashhad's own next idea, captured here so it isn't lost but also isn't built prematurely: once multiple supplier tenants exist on the platform (Phase 2+), let suppliers connect **with each other** — not just with pharmacies. Described as "like a big group chat" — a shared space where connected suppliers can:

- See each other and communicate directly,
- Refer or redirect an order to another supplier when they're out of stock on a SKU a pharmacy needs — inter-distributor stock-sharing, instead of the pharmacy having to already know who else to call,
- Possibly coordinate bulk buys or shared logistics/delivery runs in the same city, later.

**Do not build this until the private supplier↔pharmacy network (Phase 2/3) is live with real suppliers on it.** A supplier-to-supplier network is a *third* two-sided-market problem stacked on top of two that aren't solved yet — pulling it forward is exactly the scope creep §8 warns against. Revisit once Phase 3 is complete and there are a handful of real connected supplier tenants to validate the idea with directly, instead of designing it from guesses about what suppliers would want from each other.

---

## 8. Risks and honest caveats

- **This is still a large scope for a 2-client company.** The phased sequencing above (retail-first, private-network-first, manual-delivery-first, OTC-only-first) exists specifically to de-risk that — resist the temptation to build Phase 3/4 items early because they're "the interesting part."
- **Delivery is the part everyone else outsources — don't be the exception.** TinyRx is a real company that died trying to own delivery for exactly this use case. Manual assignment in v1, courier APIs later, is the right call.
- **Regulatory footing for online medicine sales is genuinely undefined in Pakistan** (DRAP and FBR don't have a joint e-pharmacy regime) and varies a lot by country for anywhere outside Pakistan this expands to. OTC-only in v1 sidesteps this; prescription/controlled items should not be added without a specific legal review per target market.
- **Two-sided cold start for Category A is a real, hard problem**, not just an engineering task — a supplier catalog is worthless with zero connected pharmacies, and vice versa. Phase 2's "private network" framing (digitize one existing real relationship at a time) is the correct way to avoid needing simultaneous supply and demand on day one.
- **Market-size figures in §2.1 and funding figures in §2.4 vary significantly by source** — treat them as directional context for prioritization, not as numbers to put in front of investors without re-verifying against a primary source at that time.
- **This document was produced from external research (web search, Sept 2026) plus the current codebase — not from primary interviews with pharmacy owners or distributors.** Before Phase 2 in particular, it's worth validating the "phone/WhatsApp ordering is painful" assumption directly with the two existing pharmacy clients and at least one prospective supplier — the research strongly suggests it's true globally, but local specifics (which suppliers, what credit terms actually look like, who has WhatsApp-only vs. an order-booker) will shape the real design.

---

## 9. Development discipline — test every logical unit

This codebase currently ships with **zero automated tests** despite `jest`/`vitest` being configured (`CLAUDE.md` Gotchas). Tolerable at 2-client scale; not tolerable once this is a multi-version product aimed at a large market — untested code compounds silently across versions until a regression from an early phase quietly breaks something a later phase depends on.

Binding instruction from this point forward, for all development regardless of who or what (including a Claude Code session) is implementing a phase from this roadmap:

- **Every logical unit gets a test before it's done** — one controller action/endpoint, one model method, one non-trivial hook/component, one utility function. Manually clicking through it once is not done; a passing automated test, written in the same session as the code, is done.
- Backend: use the test runner already configured but unused (check `server/package.json`). Cover at minimum the happy path, the main validation/error path, and — for anything multi-tenant — an explicit cross-org access-denial case. Cross-org leakage is already flagged in `CLAUDE.md` as this codebase's main correctness risk; it's exactly the bug class a test catches and a manual click-through misses.
- Frontend: at minimum, test logic-bearing hooks/utilities and any component whose conditional rendering is tied to role/plan/feature flags (`ProtectedRoute`, plan-limit gating, the storefront's prescription-required gating, etc.) — full UI coverage isn't required, but anything a bug in would silently show the wrong data to the wrong tenant or role is.
- New tables/migrations added for this roadmap (Category A tables, `storefront_orders`, etc.) ship with at least one test exercising multi-tenant scoping on that table.
- This is not a one-time cleanup task. If a phase from §7 is delivered without tests, it is not complete — don't mark it done in this document until it is.

---

## Sources
Global pharmacy POS: PioneerRx/RedSail (capterra.com, swipesavvy.com), IntuitionLabs pharmacy management systems guide (intuitionlabs.ai), Mordor Intelligence market sizing (mordorintelligence.com).
B2B distribution: Retailio (retailio.in, tracxn.com), Saveo (yourstory.com, medicaldialogues.in), ONDC (the-ken.com, ondc.org), Sokowatch/Wasoko (agfundernews.com), Field Intelligence/Maisha Meds/mPharma (cgdev.org, itweb.africa), McKesson/Cardinal (mckesson.com, cardinalhealth.com), Zuellig eZRx+ (zuelligpharma.com), SwipeRx (techcrunch.com), Thuocsi.vn (cocooncap.com).
Storefront/delivery precedents: RxLocal (rxlocal.com, pioneerrx.com), DigitalRx (digital-rx.com), ScriptDrop (docs.scriptdrop.co, uber.com), TinyRx (cbinsights.com), Toast/Shopify/Square sync mechanics (pos.toasttab.com, shopify.com), delivery-API vendors (nextbillion.ai, shipday.com), Pakistan courier landscape (techbullion.com).
Pakistan: FBR POS mandate (oneclickpos.pk, fbr.gov.pk), DRAP (dra.gov.pk, e.dra.gov.pk), Marg Pakistan (margpakistan.com), Adviyat (adviyat.com.pk), Dawaai funding (menabytes.com, propakistani.pk, crunchbase.com), pharmacy licensing context (gulfnews.com, pakistantoday.com.pk).
