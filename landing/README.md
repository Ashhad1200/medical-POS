# PharmaFlow marketing site

Next.js 15 (App Router) + React 19 + Tailwind 4. The public marketing page, the
signup flow, and each pharmacy's white-label storefront (`/store/[slug]`).

- **Design system and art direction:** [`DESIGN.md`](./DESIGN.md). Read it before changing the marketing pages.
- **Sections:** `components/site/*`. The hero's live demo is driven by the pure state machine in `lib/demo-engine.ts`.
- **Data:** plans come from the API (`GET /api/public/plans`); signup posts to `POST /api/public/signup`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3007 (expects the API on :4001)
npm test           # Vitest: lib/ in node, components in jsdom
npm run build
```

## Environment

| Variable | Used for | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base | `http://localhost:4001/api` |
| `NEXT_PUBLIC_POS_URL` | "Sign in" / post-signup link | `http://localhost:5175` |
| `NEXT_PUBLIC_SITE_URL` | canonical URL, Open Graph, sitemap | `https://pharmaflow.example.com` |
| `NEXT_PUBLIC_CONTACT_EMAIL` | every contact link | `support@pharmaflow.example.com` |
