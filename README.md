# 🧴 Attar Bazaar — Complete Perfume Marketplace (v2)

## ✅ This build was actually compiled and tested, not just written

Before this zip was created, I ran the full production pipeline myself in a
sandboxed Linux environment and fixed every error that came up, in a loop,
until it was clean:

```
npm install        → succeeded
npm run build      → succeeded (0 TypeScript errors, 0 route collisions, 30/30 routes compiled)
npm run start       → booted in <500ms
```

Then I hit every route with real HTTP requests to check for runtime crashes:

| Route | Result |
|---|---|
| `/`, `/products`, `/about`, `/contact`, `/privacy`, `/terms`, `/sell`, `/auth/login`, `/auth/register`, `/cart` | All HTTP 200 |
| `/seller`, `/admin`, `/account`, `/checkout` (not logged in) | All correctly redirect (307) to `/auth/login?redirect=...` in under 0.12s — no hangs |
| `/products/[a fake id]` | Correctly renders the custom 404 page |
| `POST /api/email` (no SMTP configured) | Returns `{"success":true,"skipped":true}` — confirmed it never crashes the caller |

**What I could not test:** actually logging in, placing an order, or receiving
an email, because that requires live network access to your Supabase project
and Gmail's SMTP server — my sandbox's network is locked to a small allow-list
(npm, GitHub, PyPI, etc.) and `supabase.co` is not on it. I checked this
directly rather than guessing:

```
curl https://zzcvciyloyaaklcbezby.supabase.co/rest/v1/...
→ HTTP 403, header: x-deny-reason: host_not_allowed
```

So the very last mile — your real credentials talking to your real database
and inbox — can only be verified by you running it. Everything up to that
boundary (every page compiling, every route resolving correctly, every
redirect firing, every API route degrading gracefully instead of crashing)
has been verified for real.

### Two real bugs this testing caught and fixed
1. **Next.js 14.2.5 had a known security vulnerability** (npm warned about it
   on install) — bumped to the latest patched **14.2.35**.
2. **Google Fonts was fetched over the network at build time** via
   `next/font/google`. If that network call ever fails (offline CI, restricted
   network, a Fonts outage), your build fails outright. Switched to
   **self-hosted fonts** (`@fontsource/*` packages) — the font files ship
   inside `node_modules` and get bundled like any other asset, so the build
   never depends on Google's servers being reachable. This is *more* secure
   and reliable for you too, not just a workaround for my sandbox.

---

## 🔐 Security — what's actually hardened, stated plainly

No system is "unhackable" — anyone who tells you otherwise is selling
something. Here is exactly what's in place and why:

- **Row Level Security on every table.** This is the real enforcement
  boundary, not just UI checks. Orders (your most sensitive table) can only
  ever be read by the buyer who placed it, the seller who owns the product,
  or an admin — enforced at the database level, so it doesn't matter what
  the client-side code does or doesn't check.
- **Role self-escalation is blocked at the database.** A Postgres trigger
  means a buyer's "Become a Seller" button can only ever set their own role
  to `seller` — never `admin`. Only an existing admin can grant admin.
- **No payment credentials ever touch this system.** JazzCash/EasyPaisa/Bank/
  COD are recorded as a *choice*, not processed — Attar Bazaar never sees or
  stores a card number, CVV, or banking password. That data simply doesn't
  exist in this app to be stolen.
- **Passwords are never handled by our code.** Supabase Auth hashes and
  stores them (industry-standard bcrypt); we never see the raw password.
- **Server-side session verification via `@supabase/ssr` + `middleware.ts`.**
  Every request to `/seller`, `/admin`, `/account`, `/checkout` is checked at
  the middleware layer before a single byte of the page renders — this is
  also what fixes the "session lost during checkout" bug, since client and
  server now read the exact same cookie-based session instead of two
  disconnected sources of truth.
- **Rate limiting** on `/api/email` and `/api/webhook` (20–60 requests/min per
  IP) so a spam script can't exhaust your SMTP quota or hammer the server.
- **File upload limits**: 5MB max, images only, enforced both client-side and
  in the Supabase Storage bucket policy itself (so it can't be bypassed by
  skipping the client check).
- **Service role key is never sent to the browser** — it only exists in
  server-side code (`lib/supabase/server.ts`, API routes), verified by
  checking every file that references it.

### What "handles thousands of users" actually depends on
This is genuinely mostly an infrastructure question, not a code one — being
honest about that:
- Vercel (hosting the Next.js app) auto-scales serverless functions per
  request; a typical marketplace app like this comfortably handles thousands
  of concurrent users on a normal Vercel plan.
- Supabase's Postgres connection pooling and your plan's row/bandwidth limits
  are the actual ceiling — the indexes added in `schema.sql` (on
  `seller_id`, `buyer_id`, `status`, `created_at`) keep queries fast as your
  data grows, which is the code-side half of that story.
- **WhatsApp integration cannot crash your backend** — it's a plain
  `wa.me` deep link opened in the visitor's own browser. Your server is never
  involved in that message being sent, so there's nothing there that can
  overload or crash.

---

## 🧩 What changed from the previous version

| Problem | Fix |
|---|---|
| "Missing NEXT_PUBLIC_SUPABASE_URL" hard crash | `lib/supabase/client.ts` and `server.ts` now log a clear console error and fall back to a harmless placeholder client instead of throwing — the page still renders. `.env.local.example` added as a template. |
| "(seller)/products" collided with "/products" | Rebuilt the route structure: buyer pages live in a transparent `(shop)` route group (still resolves to `/`, `/products`, etc.), while `/seller` and `/admin` are real, separate top-level segments with their own isolated layouts. There is only ever one route per URL — collision is structurally impossible now. |
| Login didn't redirect / checkout lost session | Migrated from a plain browser-only Supabase client to **`@supabase/ssr`**, with `middleware.ts` refreshing the session cookie on every request. Client and server now always agree on who's logged in. |
| No seller/buyer separation | `middleware.ts` redirects sellers away from the storefront entirely (to `/seller`), and blocks buyers/guests from `/seller` and `/admin`. The seller portal has its own layout with zero buyer chrome (no navbar, footer, or cart). |
| Resend → your own email | Fully on **Nodemailer + SMTP** (Gmail App Password instructions below). |
| No visibility into orders | `/admin/orders` and `/seller/orders` show: customer name/email/phone/ID, exact product, a **Cash vs Online** payment badge, bill total, and a one-click delivery status changer that emails the buyer automatically. |
| Static stats | Seller dashboard, buyer account page, and admin dashboard all use **Supabase Realtime** — order/listing changes appear instantly without a refresh. |

---

## 🚦 Role-Based Flow (exactly as requested)

- **Buyer signs in** → toast "Login Successful! Welcome back." → home page.
- **Seller signs in** → toast "Welcome to Your Merchant Center." → `/seller`.
- **Seller tries to browse/buy** → middleware redirects them straight back to
  `/seller` before the storefront page ever renders. The product page's
  "Add to Cart" button also explicitly blocks them with: *"Sellers cannot
  purchase items. Please log out and log in with a Buyer account."*
- **Logout** (from anywhere) → `supabase.auth.signOut()` + every persisted
  client store wiped + a full page reload to `/auth/login`. Nothing can
  "fall back" to a stale session afterward.
- **Buyer → Seller upgrade**: `/account` shows a "Become a Seller" card for
  buyers; clicking it flips their role (guarded by the database trigger
  above) and sends them straight into their new seller dashboard.

---

## 🚀 Setup

### 1. Database (single file — exactly as requested)
Supabase → **SQL Editor** → paste **all** of `database/schema.sql` → **Run**.
Safe to re-run any time; it upgrades your existing data (including migrating
old `'shipped'` order statuses to the new `'dispatched'`/`'out_for_delivery'`
values) without duplicating anything.

### 2. Install & Run
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:3000**

### 3. Make Yourself Admin
Sign up on the site → Supabase → Table Editor → `profiles` → set your `role`
to `admin` → refresh. (This manual step is the *only* way to create an
admin — the database trigger blocks anyone from doing it through the app.)

### 4. Email (Gmail App Password)
`frontend/.env.local` → `SMTP_PASSWORD`:
1. [myaccount.google.com/security](https://myaccount.google.com/security) → turn on 2-Step Verification
2. [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → create an App Password for "Mail"
3. Paste the 16-character code in as `SMTP_PASSWORD` (not your normal password)

Without this, the site works completely normally — emails are just logged
and skipped instead of sent.

---

## 📁 Structure

```
frontend/
  middleware.ts                 → session refresh + role-based redirects
  lib/
    supabase/client.ts            → browser client (@supabase/ssr)
    supabase/server.ts            → server client, used in Server Components
    types.ts, queries.ts, store.ts, email.ts, rate-limit.ts
  app/
    (shop)/                        → buyer storefront (transparent route group)
      page.tsx, products/, cart/, checkout/, account/, auth/, about/, contact/...
    seller/                        → isolated seller portal
      layout.tsx, page.tsx (dashboard), products/, products/new/, orders/
    admin/                          → isolated admin portal
      layout.tsx (single role check), page.tsx, users/, listings/, orders/, categories/, settings/, messages/
    api/email/, api/webhook/          → Nodemailer + rate limiting
  public/samples/                    → 12 local SVG product images (never 404)
database/
  schema.sql                         → paste this whole file into Supabase, once
_trash/                                → superseded files land here, never deleted
```

## 🔧 Tech Stack
Next.js 14.2.35 · React 18.3.1 · TypeScript · Tailwind CSS · Supabase
(Postgres + Auth + Storage + Realtime) via `@supabase/ssr` · Zustand ·
Nodemailer (SMTP) · Self-hosted fonts via `@fontsource`
