import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Local-first data layer.
//
// The whole app persists to a single SQLite file (default: ./data/paytrack.db).
// The schema mirrors the Postgres/Supabase schema in CLAUDE_BUILD_INSTRUCTIONS.md
// so the app can migrate to Supabase later by swapping this module. Multi-tenant
// isolation (the equivalent of Supabase row-level security) is enforced in the
// query helpers by always filtering on user_id.
// ---------------------------------------------------------------------------

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "paytrack.db");

// Reuse a single connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __paytrackDb?: Database.Database };

function createConnection(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  migrate(database);
  return database;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users_profile (
      id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT,
      business_name TEXT,
      tax_filing_status TEXT CHECK (tax_filing_status IN
        ('single','married_filing_jointly','married_filing_separately','head_of_household')),
      state TEXT,
      fed_tax_rate REAL NOT NULL DEFAULT 22,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('checking','savings','credit','other')),
      institution TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contractors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      email TEXT,
      address TEXT,
      tax_id TEXT,
      rate REAL,
      rate_type TEXT CHECK (rate_type IN ('hourly','salary','project')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      vendor TEXT,
      client TEXT,
      invoice_number TEXT,
      payment_method TEXT,
      is_deductible INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','plaid')),
      plaid_transaction_id TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payroll_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contractor_id TEXT NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      gross_pay REAL NOT NULL,
      hours_worked REAL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
      paid_at TEXT,
      payment_method TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tax_payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tax_year INTEGER NOT NULL,
      quarter INTEGER NOT NULL CHECK (quarter IN (1,2,3,4)),
      amount_estimated REAL,
      amount_paid REAL,
      due_date TEXT,
      paid_at TEXT,
      payment_method TEXT,
      irs_confirmation_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_tx_user_type ON transactions(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_payroll_user ON payroll_runs(user_id);
    CREATE INDEX IF NOT EXISTS idx_taxpay_user ON tax_payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);
}

export function getDb(): Database.Database {
  if (!globalForDb.__paytrackDb) {
    globalForDb.__paytrackDb = createConnection();
  }
  return globalForDb.__paytrackDb;
}
