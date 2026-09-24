# PharmaFlow marketing site: art direction & design system

The source of truth for the marketing pages under `app/(app)/`. The consumer
storefront (`app/store/*`) is white-label per pharmacy and deliberately does
**not** use this system.

## 1. What we learned before designing

**Competitors.** Mint POS, Oscar, LookPOS, EloERP, Sum Cloud, PharmaPro (PK), and
Marg (IN) all lead with the same things: batch/expiry, FEFO, 30/60/90-day alerts,
FBR invoices, red/yellow/green expiry dashboards. Visually they use generic
blue/green SaaS layouts or celebrity photography. PioneerRx (US) leads with
mission language and awards. **Nobody shows the one thing this product does
differently**: the counter sale, the pharmacy's own online store and the
supplier reorder all run off the same batch record (`PRODUCT_ROADMAP.md` §3–4).
Expiry/FEFO is table stakes, so we present it as proof of depth, not as the headline.

**References, and why they work.**

| Site | What works | What we take |
|---|---|---|
| Ramp | Hero *performs* the workflow (receipt → match → policy) instead of describing it | Hero is a working simulation of the product's core loop |
| Stripe | One loud visual, everything else quiet; copy is specific | Spend boldness in one place |
| Linear | Motion is rare and answers the product; typographic restraint | No section fade-ups; motion only where state changes |
| Attio / Mercury | Real UI is used as the image | Product fragments, art-directed and cropped, instead of screenshots in browser frames |
| Shopify POS | Physical retail context makes software tangible | Pharmacy objects (blister strip, receipt tape, delivery slip) carry the story |

## 2. The big idea: "Sell a strip. Watch three things change."

A pharmacy's stock today lives in three places that never agree: the counter
register, a WhatsApp thread with the distributor's order booker, and whatever
the shop tells customers is "available". PharmaFlow makes them one record.

**Visual metaphor: the blister strip.** Every pharmacy owner handles one a
hundred times a day. Each cavity is a unit of stock and each strip is a batch,
with its expiry printed dot-matrix on the foil. The hero lets you pop one: a
receipt line prints, the online store's count drops, and when stock crosses the
reorder level, the reorder slip lights up with the cheapest connected supplier.
FEFO is visible because the earlier-expiring strip always empties first.

The brand mark is the same idea at icon size: a pharmacy cross built from five
blister cavities, with one popped.

**Wit, used once.** Outcomes are written as a medicine leaflet's *Possible side
effects* section. Pharmacists read these daily. It lets us talk about benefits
without inventing statistics.

## 3. Tokens

### Colour ("foil & ink")
| Token | Hex | Role |
|---|---|---|
| `--pf-paper` | `#F3F5F2` | Page background: cool clinical white, faint green-grey (not cream) |
| `--pf-foil` | `#E2E6E3` | Surfaces, blister foil, table stripes |
| `--pf-foil-deep` | `#BCC4BF` | Borders, foil shadows |
| `--pf-ink` | `#0E2B22` | Text and dark sections: deep bottle green, clearly green |
| `--pf-ink-soft` | `#4A5E56` | Secondary text (AA on paper) |
| `--pf-cross` | `#0B8A57` | Brand/primary action: pharmacy-cross green |
| `--pf-amber` | `#E4A11B` | Near-expiry / reorder signal only, never decoration |

Rules: green is the brand, amber is a *signal* and means "act on this". No
gradients as decoration and no glow. Dark sections use paper-white text and
foil accents, never bright green on dark.

### Type
- **Archivo** (variable `wght` + `wdth`) for everything. Display is set condensed
  (`wdth` 72–80, weight 760–820, line-height ~0.92), like printed medicine
  packaging. Body is `wdth` 100, weight 400, 17–18px, line-height 1.55, ≤ 64ch.
- **Doto** (dot-matrix) only for batch numbers and expiry dates *printed on
  physical objects* (foil, receipt), never for UI labels.
- Sentence case everywhere. No all-caps eyebrows. Tabular numerals in product
  data.

Scale (desktop → mobile via `clamp`): display 96→44, h2 64→34, h3 26→21,
body 18→17, small 14, micro 12.

### Space, grid, shape
- 4px base: 4 8 12 16 24 32 48 64 96 128 160.
- 12-column grid, max width 1320px, 24px gutters; side gutter 20px on mobile.
- Radius follows material: physical objects round (cavities, capsules), paper
  objects square with perforated edges (receipt, leaflet), UI fragments 12px,
  buttons are capsules.
- Shadow follows material: paper gets directional layered shadow, UI fragments
  get a 1px border plus one large soft ambient shadow. No uniform card shadow.

### Motion
| Tier | Duration | Easing | Used for |
|---|---|---|---|
| micro | 140ms | `--pf-ease-out` | hover, press |
| standard | 260ms | `--pf-ease-out` | toggles, tabs, accordion |
| expressive | 520ms | spring (stiffness 380, damping 30) | demo state changes: cavity pop, receipt print, count tick |
| cinematic | 900ms | `--pf-ease-out` | one page-load sequence in the hero (plain CSS: `.pf-settle` on the headline, `.pf-rise` on the rest), nothing else |

`--pf-ease-out: cubic-bezier(.16,1,.3,1)` · `--pf-ease-in-out: cubic-bezier(.65,0,.35,1)`

Only three places move on their own: the hero load sequence, the hero demo's
idle autoplay (paused off-screen, stops after the visitor interacts), and the
scroll-linked batch timeline. Every other motion answers an action.
`prefers-reduced-motion`: no autoplay, no travel; state changes crossfade.

Stack: CSS + `framer-motion` via `LazyMotion` with features loaded async
(`components/site/motion-features.ts`) and `MotionConfig reducedMotion="user"`.
The reduced-motion flag comes from `usePrefersReducedMotion` (live, SSR-safe),
not framer's cached hook. No GSAP, WebGL or Lottie: nothing in the concept needs them.

### Performance rules (measured, keep them)
- The headline is the LCP element. It never starts at `opacity: 0` (Chrome
  skips invisible text as an LCP candidate), so it only settles into place.
- Keyed motion elements skip their `initial` state until mounted
  (`useHasMounted`), so nothing is server-rendered half-faded.
- `content-visibility: auto` (`.pf-defer`) only below the last in-page anchor:
  above an anchor it makes deep links land short.
- The mobile menu (Radix Dialog) is `next/dynamic`, loaded on first tap.
- The FAQ is native `<details>`, so answers are in the HTML and work without JS.
- Marketing icons are inline (`components/site/icons.tsx`), not an icon library.

### Breakpoints and z-index
`sm 640 · md 768 · lg 1024 · xl 1280`. z: base 0, raised 10, sticky header 40,
mobile menu 50, toast 60.

## 4. Page narrative

| # | Section | Job | Energy |
|---|---|---|---|
| 1 | Hero: live blister demo | What / who / why in one interaction | loud, interactive, light |
| 2 | Three notebooks, one shelf | The problem, in the owner's words | quiet, dense, dark |
| 3 | The life of one batch | Mechanism: receive → sell → online → near expiry → return (scroll-linked) | interactive, pinned |
| 4 | Counter / online store / suppliers | Three surfaces, three different compositions | dense, product-heavy |
| 5 | Possible side effects | Outcomes without fake numbers | open, witty, paper |
| 6 | Storage and handling | Real security and data facts | calm, dark spec sheet |
| 7 | Contents of the pack | Pricing with a plan finder built on real limits | decision-making |
| 8 | Questions | FAQ | quiet |
| 9 | Open your pharmacy | Final CTA + talk to a person | loud, green |

**CTA architecture.** Primary: *Start free trial* (header, hero, pricing, final).
Secondary: *See how it works* (hero, links to §3). Low-commitment: *Email us* /
*Book a walkthrough* (FAQ, final). *Sign in* stays in the header only.

**Proof policy.** No testimonials, logos or statistics until real ones exist.
Claims must be true of the code today (see `CLAUDE.md`). Not claimed: FBR
e-invoicing, offline mode, Urdu UI, prescription upload.
