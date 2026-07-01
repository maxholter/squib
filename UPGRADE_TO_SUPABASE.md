# Upgrade path: local SQLite → Supabase (cloud, multi‑user)

This app was built **local‑first** so it runs instantly with no accounts to create.
The data model, however, deliberately mirrors the Postgres/Supabase schema from the
original build spec, so moving to the cloud is a contained change — mostly swapping
the data layer, not rewriting features.

## Why upgrade

Move to Supabase when you want:

- Access from any device / multiple people, hosted at a URL (e.g. on Vercel).
- Managed Postgres backups and row‑level security instead of a local file.
- The future **Plaid** bank‑sync path (the `transactions` table already reserves
  `source` and `plaid_transaction_id` columns for it).

## What stays the same

- All pages, forms, charts, and the tax math (`lib/tax.ts`) are unchanged.
- The types in `lib/types.ts` already match the Postgres schema.
- Every query is already scoped by `user_id`, which maps directly to Supabase
  row‑level security policies.

## The changes

1. **Create the Postgres schema.** Run the SQL from
   `CLAUDE_BUILD_INSTRUCTIONS.md` (Phase 2) in the Supabase SQL Editor. It's the
   same tables this app uses, plus a `fed_tax_rate` column on `users_profile`
   (default 22) and RLS policies.

2. **Add the Supabase clients.** Install `@supabase/supabase-js` and `@supabase/ssr`,
   then create `lib/supabase/client.ts` and `lib/supabase/server.ts` using the SSR
   pattern, reading `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` from the environment.

3. **Swap the data layer.** Reimplement the functions in `lib/data.ts` (and the auth
   helpers in `lib/auth.ts`) against Supabase instead of `better-sqlite3`. The
   function signatures stay the same, so the pages and API routes don't change.
   Replace password/session handling with Supabase Auth.

4. **Encryption.** Keep encrypting `contractors.tax_id` server‑side (see
   `lib/crypto.ts`) or move it to Supabase Vault; never select the raw value into
   client queries.

5. **Deploy to Vercel.** Push to GitHub, import the repo in Vercel, and paste the
   three Supabase environment variables into the Vercel project settings. Vercel
   redeploys automatically on every push.

Because reads happen in server components and writes go through the API routes /
`lib/data.ts`, once the data layer points at Supabase the rest of the app "just works"
— including the eventual Plaid sync, which upserts into the same `transactions` table.
