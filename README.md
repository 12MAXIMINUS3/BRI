# Woodcraft Studio website

A website for a woodworking business that mostly makes furniture to order and also sells a few ready-made pieces. Built with React, TypeScript, Vite, Tailwind CSS, and (from Phase 2) Supabase.

"Woodcraft Studio" is a placeholder name. Change it with `VITE_BUSINESS_NAME`.

The site keeps three kinds of content separate:

| Content | What it is | How customers act on it |
| --- | --- | --- |
| **Portfolio projects** (`/work`) | Examples of past work. Not for sale. | "Request Something Similar" opens the custom-order form with the project attached. |
| **Custom-order requests** (`/custom-order`) | A customer's description of what they want. | The owner reviews it and sends a quotation. The customer accepts or declines it. |
| **Ready-made products** (`/shop`) | Finished items with a price and stock count. | The customer requests a quantity. The owner confirms stock and payment arrangements. |

No payments are taken online. Accepting a quotation or requesting a product never marks anything as paid.

---

## Status

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Project setup, design system, routing, layout, public pages | **Done** |
| 2 | Supabase schema, migrations, RLS, storage policies, auth | Next |
| 3 | Submitting custom requests and product order requests, customer dashboard | Planned |
| 4 | Admin dashboard, quotations, order management, inventory | Planned |
| 5 | Tests, accessibility review, production configuration, deployment | Planned |

### Not connected yet (Phase 1)

These parts are built and validated in the browser, but they don't send anything. Each one shows a "Not connected yet" notice instead of pretending to succeed:

- **Custom-order form**: validates every field and keeps the entered details (in sessionStorage too). Submission is wired up in Phase 3.
- **"Request This Item"** on products: Phase 3.
- **Contact form**: Phase 2.
- **Data**: portfolio projects and products come from bundled demo files (`src/features/*/demo-data.ts`). Phase 2 replaces the function bodies in `src/features/*/api.ts` with Supabase queries. The function signatures stay the same, so the pages don't need to change.
- **Business settings** come from environment variables. Phase 2 moves them into a `business_settings` table that the owner edits in the dashboard.

### Demo content

All products, projects, images, and About/craftsmanship copy are **demo or placeholder content**. Labels on the site say so: "Demo", "Demo image", and "Placeholder copy". There are no photos yet. Images render as wood-tone surfaces labelled "Demo image" until real photo URLs are added. Set `VITE_SHOW_DEMO_LABELS=false` only after every demo entry has been replaced.

---

## Assumptions

- No country, currency, payment provider, or delivery policy is assumed. The currency comes from `VITE_CURRENCY_CODE`. Until it is set, prices show as `450.00 (currency not set)`.
- Money is stored as integer minor units (for example, cents) to avoid rounding errors.
- Prices and totals shown in the browser are for display only. In Phase 3, the server recalculates every amount from the database.
- A sign-in will be required before submitting a custom request or a product order request (Phase 3). Anyone can browse without an account.
- Material, finish, and category lists are in `src/config/catalog.ts` and can be edited.

## Setup

Requirements: Node.js 20.19 or later (tested on Node 24) and npm.

```bash
npm install
cp .env.example .env.local     # then edit the values
npm run dev                    # http://localhost:5173
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the test suite once |
| `npm run typecheck` | TypeScript only |

### Environment variables

See `.env.example`. Every `VITE_*` value ends up in the public JavaScript bundle. Only the Supabase **anon** key goes there. **The service-role key must never be added to frontend code or `VITE_*` variables.**

---

## Project structure

```
├── index.html                 Default title and description (what non-JS crawlers see)
├── public/                    favicon, robots.txt
├── src/
│   ├── main.tsx               Entry: React Query + Router providers
│   ├── index.css              Tailwind v4 theme tokens and base styles
│   ├── app/
│   │   ├── router.tsx         Route table (form pages are code-split)
│   │   └── queryClient.ts     Data-fetching defaults (mutations never auto-retry)
│   ├── config/
│   │   ├── business.ts        Name, contact details, currency, locale, demo labels
│   │   └── catalog.ts         Categories, materials, finishes, units
│   ├── lib/                   money formatting, errors, page meta, safe storage
│   ├── types/                 Shared types (images)
│   ├── components/
│   │   ├── ui/                Button, Alert, Badge, Dialog, Pagination, form fields…
│   │   ├── media/             WoodImage (lazy, no layout shift, placeholder), ImageGallery
│   │   └── layout/            Header (mobile drawer), footer, PublicLayout
│   ├── features/
│   │   ├── home/              Home page sections
│   │   ├── portfolio/         Types, demo data, api, hooks, cards, pages
│   │   ├── products/          + availability rules, quantity stepper, order panel
│   │   ├── custom-orders/     Zod schema, payload mapping, draft persistence, form page
│   │   ├── contact/           Schema (with honeypot), details, page
│   │   └── about/
│   ├── pages/                 NotFoundPage
│   └── test/                  Test setup and render helpers
└── (Phase 2) supabase/
    ├── migrations/            SQL schema, RLS, storage policies, functions
    └── seed.sql               Demo content flagged is_demo = true
```

Each feature folder follows the same pattern: `types.ts` → `api.ts` (the only file that talks to the backend) → `hooks.ts` (React Query) → `components/` → `pages/`.

## Dependencies

| Package | Why it's needed |
| --- | --- |
| react, react-dom, react-router | UI and routing |
| @tanstack/react-query | Consistent loading, error, and caching states for every data call |
| react-hook-form, @hookform/resolvers, zod | Accessible forms with one validation schema per form |
| tailwindcss, @tailwindcss/vite | Styling |
| vitest, @testing-library/*, jsdom | Tests |

Icons are inline SVGs and dialogs use the native `<dialog>` element, so neither needs a library.

## Accessibility (built in Phase 1)

- Skip link. Focus moves to the main content after navigation.
- Visible focus outline on every interactive element.
- Accessible mobile menu built on the native `<dialog>`: focus is contained, Escape closes it, and focus returns to the menu button.
- Every input has a `<label>`. Errors are linked to their fields through `aria-describedby` and `aria-invalid`, and a summary alert appears when a submission fails.
- Filter buttons use `aria-pressed`. Pagination uses `aria-current`. Result regions are `aria-live`.
- Text colour pairs meet WCAG AA contrast.
- Animations are turned off when the visitor's system asks for reduced motion.

A full audit is part of Phase 5.

## SEO and rendering

This is a **client-rendered single-page app**. What that means in practice:

- `index.html` holds a default title and description. Each page then updates its title, description, and Open Graph tags (`usePageMeta`) after JavaScript runs.
- Google runs JavaScript and will usually index each page's content and titles, though sometimes with a delay.
- **Link previews** (WhatsApp, Facebook, Slack, and similar) and some search engines **do not run JavaScript**. They will see the default title and description for every URL, not the specific product or project.
- If per-page previews or faster indexing matter, the options in Phase 5 are: (a) prerender the public routes to static HTML at build time, (b) add an edge function that injects page-specific meta tags, or (c) move the public pages to a server-rendered framework. Option (a) is the cheapest.
- `robots.txt` excludes `/account` and `/admin`.

## Tests

`npm test` runs 29 tests:

- Money formatting, including zero-decimal currencies and the unconfigured-currency case
- Stock availability and quantity clamping (no requesting more than is in stock)
- Custom-order validation (required acknowledgement, dimensions, quantity, budget range, dates, image type, size, and count) and payload conversion
- Route-level tests: both calls to action, "Request Something Similar" linking, out-of-stock products can't be requested, the not-connected notice appears instead of a fake confirmation, entered data is kept after a failed submission, the reference project is prefilled, and the 404 page

Permission, quotation-acceptance, duplicate-submission, and overselling tests run against the database in Phases 2 to 4.

---

## Next: Phase 2

- `supabase/migrations/` with tables for profiles (role protected from self-escalation), portfolio projects and images, products and images, custom requests and attachments, quotations and line items, orders and order items, status history, admin notes, contact inquiries, and business settings
- Separate enums for request, quotation, payment, and production status
- Row Level Security on every table: the public sees published content only, customers see only their own records, and management and internal notes are admin-only
- Storage buckets: a public `catalog-images` bucket and a private `request-attachments` bucket, with type and size limits
- A secure way to create the first administrator (SQL run by the owner, not callable from the browser)
- A rate-limited `submit_contact_inquiry` function
- Supabase Auth: register, sign in, sign out, reset password, and returning to the intended page after sign-in
- `src/lib/supabase.ts` and replacing the demo `api.ts` bodies with real queries
