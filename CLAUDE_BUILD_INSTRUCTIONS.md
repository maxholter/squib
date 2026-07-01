# Payroll Tracker — Claude Code Build Instructions

## What We're Building

A lightweight bookkeeping web app for small businesses with a handful of 1099 contractors.
It tracks income, categorized expenses, payroll runs, and tax payments — and estimates
quarterly tax obligations automatically. All data entry is manual for now, with a clean
upgrade path to Plaid bank sync later.

**Deployment model**: A web app hosted in the cloud. Users open a URL in any browser —
no installation, no OS compatibility issues. Works on Windows, Mac, phone, or tablet.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Frontend + API in one project |
| Database + Auth | Supabase | PostgreSQL, row-level security, free tier |
| Hosting | Vercel | One-click deploys, free tier, works perfectly with Next.js |
| Styling | Tailwind CSS | Fast, consistent, no CSS files to manage |
| UI Components | shadcn/ui | Pre-built accessible components |
| Forms | React Hook Form + Zod | Validation and type safety |
| Charts | Recharts | Lightweight, works well in React |

---

## Prerequisites for Claude Code

Before starting, make sure these are installed on your machine:

- **Node.js 18+** — download from https://nodejs.org (choose the LTS version)
- **Git** — download from https://git-scm.com
- **A Supabase account** — free at https://supabase.com
- **A Vercel account** — free at https://vercel.com (sign up with GitHub)
- **Claude Code** — install with `npm install -g @anthropic/claude-code` in your terminal

---

## Phase 1 — Project Setup

Tell Claude Code:

```
Create a new Next.js 14 project called "payroll-tracker" using the App Router.
Include Tailwind CSS, TypeScript, and ESLint. After scaffolding, install these
additional dependencies:

- @supabase/supabase-js
- @supabase/ssr
- shadcn/ui (run the shadcn init command)
- react-hook-form
- @hookform/resolvers
- zod
- recharts
- date-fns
- lucide-react

Initialize shadcn/ui with the "default" style and "slate" base color.
Add these shadcn components: button, input, label, card, table, dialog,
select, badge, tabs, toast, form, separator.

Create a .env.local file with placeholders:
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Phase 2 — Database Schema

Go to your Supabase project → SQL Editor and run this schema. Then tell Claude Code
to use it as the source of truth for all TypeScript types.

```sql
-- Enable Row Level Security on all tables (each user only sees their own data)

create table users_profile (
  id uuid references auth.users(id) primary key,
  full_name text,
  business_name text,
  tax_filing_status text check (tax_filing_status in ('single','married_filing_jointly','married_filing_separately','head_of_household')),
  state text,
  created_at timestamptz default now()
);
alter table users_profile enable row level security;
create policy "Users see own profile" on users_profile for all using (auth.uid() = id);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  type text check (type in ('checking','savings','credit','other')) not null,
  institution text,
  created_at timestamptz default now()
);
alter table accounts enable row level security;
create policy "Users see own accounts" on accounts for all using (auth.uid() = user_id);

create table contractors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  full_name text not null,
  email text,
  address text,
  tax_id text,
  rate numeric(10,2),
  rate_type text check (rate_type in ('hourly','salary','project')),
  active boolean default true,
  created_at timestamptz default now()
);
alter table contractors enable row level security;
create policy "Users see own contractors" on contractors for all using (auth.uid() = user_id);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  account_id uuid references accounts(id),
  type text check (type in ('income','expense')) not null,
  amount numeric(12,2) not null,
  date date not null,
  description text,
  category text not null,
  vendor text,
  client text,
  invoice_number text,
  is_deductible boolean default false,
  notes text,
  source text check (source in ('manual','plaid')) default 'manual',
  plaid_transaction_id text unique,  -- reserved for Plaid upgrade
  created_at timestamptz default now()
);
alter table transactions enable row level security;
create policy "Users see own transactions" on transactions for all using (auth.uid() = user_id);

create table payroll_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  contractor_id uuid references contractors(id) not null,
  period_start date not null,
  period_end date not null,
  gross_pay numeric(10,2) not null,
  hours_worked numeric(6,2),
  status text check (status in ('pending','paid','cancelled')) default 'pending',
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz default now()
);
alter table payroll_runs enable row level security;
create policy "Users see own payroll" on payroll_runs for all using (auth.uid() = user_id);

create table tax_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  tax_year integer not null,
  quarter integer check (quarter in (1,2,3,4)) not null,
  amount_estimated numeric(10,2),
  amount_paid numeric(10,2),
  due_date date,
  paid_at date,
  payment_method text,
  irs_confirmation_number text,
  notes text,
  created_at timestamptz default now()
);
alter table tax_payments enable row level security;
create policy "Users see own tax payments" on tax_payments for all using (auth.uid() = user_id);
```

Tell Claude Code:

```
Generate TypeScript types from the Supabase schema above. Create a file at
lib/types.ts that exports interfaces for: UserProfile, Account, Contractor,
Transaction, PayrollRun, and TaxPayment. Also create lib/supabase/client.ts
and lib/supabase/server.ts using the Supabase SSR pattern for Next.js App Router.
```

---

## Phase 3 — Authentication

Tell Claude Code:

```
Build a complete authentication flow using Supabase Auth.

- Sign up page at /auth/signup (email + password, business name, full name)
- Sign in page at /auth/signin
- Redirect to /dashboard after successful login
- Sign out button in the nav
- Protected route middleware: if user is not logged in and visits any page
  under /dashboard, redirect to /auth/signin
- After first sign up, insert a row into users_profile with the user's id

Use the Next.js App Router middleware pattern with Supabase SSR.
```

---

## Phase 4 — App Shell & Navigation

Tell Claude Code:

```
Build the main app shell for authenticated users.

Create a persistent sidebar layout at app/(dashboard)/layout.tsx with:
- App name "PayTrack" at the top
- Nav links: Dashboard, Income, Expenses, Payroll, Tax Tracker, Accounts, Contractors, Settings
- User email and sign out button at the bottom
- Collapsed/icon-only mode on small screens

The layout should wrap all pages under /dashboard.
Use shadcn Card components and Tailwind for styling.
Keep it clean and professional — this is an accounting tool, not a marketing site.
```

---

## Phase 5 — Dashboard / Overview Page

Tell Claude Code:

```
Build the main dashboard page at app/(dashboard)/dashboard/page.tsx.

Show these summary cards at the top:
- Total income this month
- Total expenses this month
- Net profit this month
- Estimated tax owed this quarter

Below the cards, show:
- A monthly income vs expenses bar chart using Recharts (last 6 months)
- A recent transactions table (last 10 entries, showing date, description, category, amount)
- A "payments due soon" section showing upcoming quarterly tax deadlines

All data should be fetched from Supabase using server components where possible.
Use date-fns for all date formatting and calculations.
```

---

## Phase 6 — Income Module

Tell Claude Code:

```
Build the income section at app/(dashboard)/income/page.tsx.

Features:
1. A table of all income transactions sorted by date descending.
   Columns: Date, Client, Description, Invoice #, Account, Amount.
   Include a search bar and date range filter.

2. An "Add Income" button that opens a dialog/modal with a form:
   - Date (date picker)
   - Amount (number input, 2 decimal places)
   - Client name (text)
   - Description (text)
   - Invoice number (optional text)
   - Account (dropdown from the user's accounts)
   - Payment method (dropdown: check, ACH, wire, cash, other)
   - Notes (optional textarea)

3. Clicking a row shows an edit dialog pre-filled with that transaction's data.

4. A delete button on each row with a confirmation dialog.

Use React Hook Form + Zod for form validation. All mutations go through
Next.js API routes that use the Supabase service role key server-side.
```

---

## Phase 7 — Expenses Module

Tell Claude Code:

```
Build the expenses section at app/(dashboard)/expenses/page.tsx.

Features:
1. A table of all expense transactions with columns:
   Date, Vendor, Category, Description, Account, Deductible, Amount.
   Include search, date range filter, and category filter.

2. An "Add Expense" button opening a form dialog with:
   - Date (date picker)
   - Amount (number input)
   - Vendor name (text)
   - Category (dropdown — use this IRS Schedule C list):
       Advertising, Car & Truck, Commissions & Fees, Contract Labor,
       Depreciation, Employee Benefits, Insurance, Legal & Professional,
       Office Expense, Rent & Lease, Repairs & Maintenance, Supplies,
       Taxes & Licenses, Travel, Meals (50% deductible), Utilities,
       Wages, Other
   - Description (text)
   - Account (dropdown from user's accounts)
   - Is this deductible? (toggle, defaults to true for most categories)
   - Notes (optional textarea)

3. A summary panel on the right showing expense totals by category for
   the selected date range, with a donut chart using Recharts.

4. Edit and delete on each row.

Use the same form/validation pattern as the income module.
```

---

## Phase 8 — Payroll Module

Tell Claude Code:

```
Build the payroll section at app/(dashboard)/payroll/page.tsx.

Features:
1. A table of payroll runs with columns:
   Period, Contractor, Gross Pay, Hours, Status, Paid Date.
   Filter by contractor and status.

2. An "Add Payroll Run" button with a form:
   - Contractor (dropdown from the user's contractors list)
   - Pay period start and end dates
   - Gross pay amount
   - Hours worked (optional, for hourly contractors)
   - Payment method (ACH, check, wire, other)
   - Status (pending / paid)
   - If status is "paid", show a "Paid date" field
   - Notes

3. A "Mark as Paid" quick action button on pending rows.

4. A yearly summary table at the bottom showing each contractor's
   total payments for the year (important for 1099 filing — flag
   any contractor who has been paid $600 or more with a badge).

5. Edit and delete on each row.
```

---

## Phase 9 — Contractors Module

Tell Claude Code:

```
Build the contractors section at app/(dashboard)/contractors/page.tsx.

Features:
1. A card grid of all contractors showing name, email, rate, and status (active/inactive).

2. An "Add Contractor" button with a form:
   - Full name
   - Email
   - Address (textarea — needed for 1099)
   - Tax ID / EIN / SSN (text, mark as sensitive — do not display after saving, show as *****)
   - Default rate (number)
   - Rate type (hourly / salary / project)
   - Active status toggle

3. Clicking a contractor card opens a detail view showing:
   - Their info
   - All payroll runs for that contractor
   - Total paid this year

4. Edit and deactivate (not delete) actions.

Note: Tax ID must be stored encrypted. Use Supabase Vault or at minimum
encrypt/decrypt it with a server-side API route — never expose it in
client-side queries.
```

---

## Phase 10 — Tax Tracker Module

Tell Claude Code:

```
Build the tax tracker at app/(dashboard)/tax/page.tsx.

This is the most important module for the user. It should:

1. Show a year overview with 4 quarter cards. Each card displays:
   - Quarter label (Q1, Q2, Q3, Q4) and IRS due date
   - Estimated tax owed (calculated, see formula below)
   - Amount paid
   - Status badge: PAID / DUE SOON / OVERDUE / UPCOMING
   - A "Log Payment" button

2. Tax estimation formula (show the math clearly in the UI):
   - Net profit = total income - total deductible expenses (for the quarter)
   - Self-employment tax = net profit × 0.9235 × 0.153
   - SE tax deduction = SE tax × 0.5
   - Taxable income = net profit - SE tax deduction
   - Federal income tax estimate = taxable income × (use 22% as default, make this editable in Settings)
   - Total estimated = SE tax + federal income tax estimate
   - Show each line item so the user understands it

3. A "Log Tax Payment" dialog with:
   - Year and quarter (pre-filled based on which card they clicked)
   - Amount paid
   - Date paid
   - Payment method (EFTPS, check, debit card)
   - IRS confirmation number (optional)
   - Notes

4. A payment history table below the cards showing all logged payments.

5. A disclaimer note: "These are estimates only. Consult a tax professional
   for your actual tax liability."

IRS quarterly due dates:
- Q1 (Jan–Mar): April 15
- Q2 (Apr–May): June 15
- Q3 (Jun–Aug): September 15
- Q4 (Sep–Dec): January 15 of next year
```

---

## Phase 11 — Accounts Module

Tell Claude Code:

```
Build the accounts section at app/(dashboard)/accounts/page.tsx.

Features:
1. A list of the user's linked accounts (bank accounts, credit cards).
   Show name, type, institution, and a running total of transactions tagged to it.

2. An "Add Account" button with a form:
   - Account nickname (e.g. "Business Checking")
   - Account type (checking, savings, credit, other)
   - Institution name (e.g. "Chase")

3. Edit and delete (only if no transactions are linked to it).

4. Each account card shows income total, expense total, and net for the
   selected date range.

Note: We are NOT storing account numbers. This is just for labeling and
organizing transactions. The Plaid upgrade will add actual account linking later.
```

---

## Phase 12 — Settings Page

Tell Claude Code:

```
Build the settings page at app/(dashboard)/settings/page.tsx with tabs:

Tab 1 — Profile:
- Full name
- Business name
- Tax filing status (single, married filing jointly, etc.)
- State of residence (dropdown)

Tab 2 — Tax Settings:
- Federal income tax rate override (default 22%, slider or number input, range 10–37%)
- Explanation of what this affects

Tab 3 — Export:
- Export all transactions as CSV (date range picker + download button)
- Export payroll runs as CSV
- Export tax payment log as CSV

All forms auto-save on submit with a success toast.
```

---

## Phase 13 — Plaid Upgrade Path (Future — Do Not Build Yet)

When ready to add Plaid, the approach is:

1. Add `plaid_access_token` (encrypted) to the `users_profile` table
2. Add a Plaid Link button to the Accounts page
3. Create a server-side API route at `/api/plaid/exchange-token` that exchanges
   the Plaid public token for an access token and stores it encrypted
4. Create `/api/plaid/sync` that fetches transactions from Plaid and upserts
   them into the `transactions` table with `source='plaid'` and the
   `plaid_transaction_id` set (the unique constraint prevents duplicates)
5. The rest of the app — tax estimates, dashboard, reports — works unchanged
   because it reads from `transactions` regardless of source

The `source` column and `plaid_transaction_id` column are already in the schema
waiting for this. No migrations needed.

---

## Phase 14 — Deploy to Vercel

Tell Claude Code:

```
Prepare this app for production deployment to Vercel.

1. Make sure all environment variables are referenced correctly via process.env
   and are listed in a .env.example file (with no real values).

2. Add a vercel.json if any configuration is needed.

3. Confirm there are no hardcoded localhost URLs anywhere.

4. Write a DEPLOYMENT.md with step-by-step instructions for a non-technical user
   to deploy this app, including:
   - How to push the code to GitHub
   - How to connect the GitHub repo to Vercel
   - Where to paste the Supabase environment variables in Vercel's dashboard
   - How to set up the custom domain (optional)
   - How to run the database schema in Supabase SQL Editor
```

---

## Sharing With Non-Technical Users

Once deployed to Vercel, sharing the app is simple:

1. **They need nothing installed.** The app runs entirely in their browser.
2. **Send them the Vercel URL** (e.g. `https://payroll-tracker.vercel.app`).
3. **They create an account** using the sign-up page with their email and password.
4. **Each user's data is completely isolated** — row-level security in Supabase
   ensures users can never see each other's data.
5. **Updates are automatic** — when you push new code to GitHub, Vercel redeploys
   in about 30 seconds. Everyone gets the update immediately with no action needed.

If you want to restrict who can sign up (e.g. only invite specific employees),
tell Claude Code to add an invite-only mode using Supabase's email invite feature.

---

## Ongoing Development Tips

- **Always test with a fresh incognito window** to catch auth/session bugs.
- **Never put secrets in client components** — anything in `app/` that doesn't
  say `'use server'` runs in the browser. API keys must only live in API routes.
- **Back up your Supabase data** weekly using Supabase's built-in backups
  (available on the Pro plan) or by exporting CSVs from the dashboard.
- **The free tiers are generous** — Supabase free gives you 500MB storage and
  50,000 monthly active users. Vercel free gives you unlimited deployments.
  For a small team, you may never need to pay anything.
