# Deploying PayTrack

PayTrack is local‑first, so you have two very different options depending on who
needs to use it.

## Option A — Just run it on one computer (simplest)

This is all most single‑owner businesses need.

```bash
npm install
npm run build     # one-time production build
npm start         # serves on http://localhost:3000
```

- Leave the terminal running while you use the app, or set it up to start
  automatically (e.g. a `pm2`/`launchd`/Task Scheduler entry running `npm start`).
- **Set a stable secret first.** Create a `.env.local` file with a long random
  `SESSION_SECRET` (see the README) — otherwise sessions and encrypted fields reset
  if the default changes.
- **Back up `./data/paytrack.db`** regularly (copy it to a cloud drive). That single
  file is your entire bookkeeping history.

### Reaching it from your phone on the same network

Run `npm start`, find your computer's local IP (e.g. `192.168.1.20`), and open
`http://192.168.1.20:3000` from your phone on the same Wi‑Fi.

## Option B — Host it online for multiple people

The local SQLite database does not fit serverless hosts like Vercel (their
filesystem is read‑only/ephemeral). For a true multi‑user cloud deployment,
migrate the data layer to Supabase and deploy to Vercel — see
[UPGRADE_TO_SUPABASE.md](./UPGRADE_TO_SUPABASE.md). That path gives you:

1. Push the code to GitHub.
2. Import the repo into Vercel.
3. Paste the Supabase environment variables into Vercel's project settings.
4. Run the schema SQL in the Supabase SQL Editor.
5. Optionally add a custom domain in Vercel.

Alternatively, you can host the local‑first build as‑is on any always‑on server
(a small VPS, a Raspberry Pi, etc.) with a persistent disk for `./data`, running
`npm start` behind a reverse proxy — the SQLite file just needs to live on real disk.

## Security checklist before sharing

- [ ] `SESSION_SECRET` set to a long random value.
- [ ] Served over HTTPS if it's reachable from the internet.
- [ ] `./data/paytrack.db` backed up somewhere safe.
- [ ] Only people you trust can reach the URL (the sign‑up page is open by default).
