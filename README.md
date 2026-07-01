# PayTrack — Simple Bookkeeping & Payroll

A simple, free payroll and bookkeeping app — an alternative to what QuickBooks used to
offer at low cost. It's a lightweight web app for small businesses with a handful of
1099 contractors: it tracks **income**, **categorized expenses**, **payroll runs**, and
**tax payments** — and estimates your **quarterly taxes** automatically. Built to replace
an expensive accounting subscription or a messy spreadsheet.

This build is **local-first**: it runs on your own machine with a built-in database,
so there is **nothing to sign up for and no cloud setup**. When you're ready to put it
online for multiple users, see [UPGRADE_TO_SUPABASE.md](./UPGRADE_TO_SUPABASE.md).

---

## Run it (2 commands)

You need [Node.js 18+](https://nodejs.org) (LTS). Then, in this folder:

```bash
npm install
npm run dev
```

Open **http://localhost:3000** in your browser, click **Sign up**, and create an
account. That's it — your data is saved to a local database file at `./data/paytrack.db`.

To stop the app, press `Ctrl+C` in the terminal. To start it again later, just run
`npm run dev` from this folder.

### Prefer a real desktop app?

You can package PayTrack as a **double-click desktop app** (its own window, no terminal,
nothing for end users to install) for macOS and Windows:

```bash
npm run dist:mac    # → dist-app/PayTrack-<version>.dmg
npm run dist:win    # → dist-app/PayTrack Setup <version>.exe   (build on Windows)
```

See **[PACKAGING.md](./PACKAGING.md)** for details, distribution notes, and where the
data lives per‑user.

---

## What's inside

| Module | What it does |
|---|---|
| **Dashboard** | This month's income, expenses, net profit, and estimated quarterly tax; a 6‑month income‑vs‑expense chart; recent transactions; upcoming tax deadlines. |
| **Income** | Log money coming in (client, invoice #, account). Search + date filters. |
| **Expenses** | Log spending with IRS Schedule C categories and a deductible flag. Category breakdown donut. |
| **Payroll** | Record contractor pay runs, mark them paid, and see yearly totals with a **1099 flag** at $600+. |
| **Contractors** | Manage your 1099 contractors. Tax IDs are **encrypted at rest** and shown masked. |
| **Tax Tracker** | Four quarter cards with estimated tax owed (the full math is shown), payment logging, and history. |
| **Accounts** | Label your bank/credit accounts and see per‑account income/expense totals. |
| **Settings** | Business profile, an adjustable federal tax‑rate assumption, and CSV export. |

---

## Your data

- Everything lives in a single SQLite file: **`./data/paytrack.db`**.
- **Back it up** by copying that file somewhere safe (it holds all your records).
- Each signed‑up user's data is isolated — every query is scoped to the logged‑in user.
- Contractor Tax IDs / SSNs are encrypted before they're written to disk.

### Optional configuration

Copy `.env.example` to `.env.local` if you want to change anything (all optional):

- `DATABASE_PATH` — where the database file lives.
- `SESSION_SECRET` — a long random string used to sign login cookies and encrypt
  sensitive fields. **Set this to a stable random value before deploying** anywhere
  other than your own laptop. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## Tech

Next.js 14 (App Router) · TypeScript · Tailwind CSS · SQLite (better‑sqlite3) ·
React Hook Form + Zod · Recharts · date‑fns · lucide‑react.

## Disclaimer

Tax figures in this app are **estimates only** and are not tax advice. Consult a
qualified tax professional for your actual liability.
