import { getDb } from "./db";
import { newId, encryptField, decryptField, maskTaxId } from "./crypto";
import type {
  Account,
  Contractor,
  PayrollRun,
  TaxPayment,
  Transaction,
} from "./types";

// SQLite stores booleans as 0/1 — convert on the way out.
function toBool(v: unknown): boolean {
  return v === 1 || v === true;
}

// ------------------------------- Accounts ----------------------------------

export function listAccounts(userId: string): Account[] {
  const rows = getDb()
    .prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY name COLLATE NOCASE")
    .all(userId) as Account[];
  return rows;
}

export function createAccount(
  userId: string,
  data: Pick<Account, "name" | "type" | "institution">,
): Account {
  const id = newId();
  getDb()
    .prepare(
      "INSERT INTO accounts (id, user_id, name, type, institution) VALUES (?, ?, ?, ?, ?)",
    )
    .run(id, userId, data.name, data.type, data.institution ?? null);
  return getDb().prepare("SELECT * FROM accounts WHERE id = ?").get(id) as Account;
}

export function updateAccount(
  userId: string,
  id: string,
  data: Pick<Account, "name" | "type" | "institution">,
): void {
  getDb()
    .prepare(
      "UPDATE accounts SET name = ?, type = ?, institution = ? WHERE id = ? AND user_id = ?",
    )
    .run(data.name, data.type, data.institution ?? null, id, userId);
}

export function accountTransactionCount(userId: string, accountId: string): number {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS c FROM transactions WHERE user_id = ? AND account_id = ?",
    )
    .get(userId, accountId) as { c: number };
  return row.c;
}

export function deleteAccount(userId: string, id: string): void {
  getDb().prepare("DELETE FROM accounts WHERE id = ? AND user_id = ?").run(id, userId);
}

// Per-account income/expense totals over an optional date range.
export function accountTotals(
  userId: string,
  from?: string,
  to?: string,
): Record<string, { income: number; expense: number }> {
  let sql =
    "SELECT account_id, type, SUM(amount) AS total FROM transactions WHERE user_id = ?";
  const params: unknown[] = [userId];
  if (from) {
    sql += " AND date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND date <= ?";
    params.push(to);
  }
  sql += " GROUP BY account_id, type";
  const rows = getDb().prepare(sql).all(...params) as {
    account_id: string | null;
    type: "income" | "expense";
    total: number;
  }[];
  const out: Record<string, { income: number; expense: number }> = {};
  for (const r of rows) {
    const key = r.account_id ?? "none";
    out[key] = out[key] || { income: 0, expense: 0 };
    out[key][r.type] = r.total;
  }
  return out;
}

// ----------------------------- Transactions --------------------------------

export interface TransactionFilter {
  type?: "income" | "expense";
  from?: string;
  to?: string;
  category?: string;
  search?: string;
}

export function listTransactions(
  userId: string,
  filter: TransactionFilter = {},
): Transaction[] {
  let sql = "SELECT * FROM transactions WHERE user_id = ?";
  const params: unknown[] = [userId];
  if (filter.type) {
    sql += " AND type = ?";
    params.push(filter.type);
  }
  if (filter.from) {
    sql += " AND date >= ?";
    params.push(filter.from);
  }
  if (filter.to) {
    sql += " AND date <= ?";
    params.push(filter.to);
  }
  if (filter.category) {
    sql += " AND category = ?";
    params.push(filter.category);
  }
  if (filter.search) {
    sql +=
      " AND (description LIKE ? OR vendor LIKE ? OR client LIKE ? OR invoice_number LIKE ? OR notes LIKE ?)";
    const like = `%${filter.search}%`;
    params.push(like, like, like, like, like);
  }
  sql += " ORDER BY date DESC, created_at DESC";
  const rows = getDb().prepare(sql).all(...params) as any[];
  return rows.map((r) => ({ ...r, is_deductible: toBool(r.is_deductible) })) as Transaction[];
}

export function getTransaction(userId: string, id: string): Transaction | null {
  const r = getDb()
    .prepare("SELECT * FROM transactions WHERE id = ? AND user_id = ?")
    .get(id, userId) as any;
  if (!r) return null;
  return { ...r, is_deductible: toBool(r.is_deductible) };
}

export type TransactionInput = Omit<
  Transaction,
  "id" | "user_id" | "created_at" | "source" | "plaid_transaction_id"
>;

export function createTransaction(userId: string, data: TransactionInput): Transaction {
  const id = newId();
  getDb()
    .prepare(
      `INSERT INTO transactions
        (id, user_id, account_id, type, amount, date, description, category,
         vendor, client, invoice_number, payment_method, is_deductible, notes, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')`,
    )
    .run(
      id,
      userId,
      data.account_id ?? null,
      data.type,
      data.amount,
      data.date,
      data.description ?? null,
      data.category,
      data.vendor ?? null,
      data.client ?? null,
      data.invoice_number ?? null,
      data.payment_method ?? null,
      data.is_deductible ? 1 : 0,
      data.notes ?? null,
    );
  return getTransaction(userId, id)!;
}

export function updateTransaction(
  userId: string,
  id: string,
  data: TransactionInput,
): void {
  getDb()
    .prepare(
      `UPDATE transactions SET
        account_id = ?, type = ?, amount = ?, date = ?, description = ?, category = ?,
        vendor = ?, client = ?, invoice_number = ?, payment_method = ?,
        is_deductible = ?, notes = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      data.account_id ?? null,
      data.type,
      data.amount,
      data.date,
      data.description ?? null,
      data.category,
      data.vendor ?? null,
      data.client ?? null,
      data.invoice_number ?? null,
      data.payment_method ?? null,
      data.is_deductible ? 1 : 0,
      data.notes ?? null,
      id,
      userId,
    );
}

export function deleteTransaction(userId: string, id: string): void {
  getDb().prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(id, userId);
}

// Sum income / deductible-expense between dates (inclusive). Used by tax + dashboard.
export function incomeExpenseTotals(
  userId: string,
  from: string,
  to: string,
): { income: number; expenses: number; deductibleExpenses: number } {
  const db = getDb();
  const income = (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?",
      )
      .get(userId, from, to) as { s: number }
  ).s;
  const expenses = (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?",
      )
      .get(userId, from, to) as { s: number }
  ).s;
  const deductibleExpenses = (
    db
      .prepare(
        "SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id = ? AND type = 'expense' AND is_deductible = 1 AND date >= ? AND date <= ?",
      )
      .get(userId, from, to) as { s: number }
  ).s;
  return { income, expenses, deductibleExpenses };
}

// Expense totals grouped by category for a date range (for the donut chart).
export function expensesByCategory(
  userId: string,
  from?: string,
  to?: string,
): { category: string; total: number }[] {
  let sql =
    "SELECT category, SUM(amount) AS total FROM transactions WHERE user_id = ? AND type = 'expense'";
  const params: unknown[] = [userId];
  if (from) {
    sql += " AND date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND date <= ?";
    params.push(to);
  }
  sql += " GROUP BY category ORDER BY total DESC";
  return getDb().prepare(sql).all(...params) as { category: string; total: number }[];
}

// Monthly income vs expense buckets for the last N months (dashboard chart).
export function monthlyTotals(
  userId: string,
  months: number,
): { month: string; income: number; expenses: number }[] {
  const db = getDb();
  const now = new Date();
  const result: { month: string; income: number; expenses: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const end = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, "0")}-${String(endD.getDate()).padStart(2, "0")}`;
    const income = (
      db
        .prepare(
          "SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id = ? AND type='income' AND date >= ? AND date <= ?",
        )
        .get(userId, start, end) as { s: number }
    ).s;
    const expenses = (
      db
        .prepare(
          "SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id = ? AND type='expense' AND date >= ? AND date <= ?",
        )
        .get(userId, start, end) as { s: number }
    ).s;
    result.push({
      month: d.toLocaleString("en-US", { month: "short" }),
      income,
      expenses,
    });
  }
  return result;
}

// ----------------------------- Contractors ---------------------------------

// Contractors are returned with tax_id MASKED — the raw value never leaves the server.
export function listContractors(userId: string): Contractor[] {
  const rows = getDb()
    .prepare("SELECT * FROM contractors WHERE user_id = ? ORDER BY full_name COLLATE NOCASE")
    .all(userId) as any[];
  return rows.map((r) => ({
    ...r,
    active: toBool(r.active),
    tax_id: maskTaxId(r.tax_id ? decryptField(r.tax_id) : null),
  }));
}

export function getContractor(userId: string, id: string): Contractor | null {
  const r = getDb()
    .prepare("SELECT * FROM contractors WHERE id = ? AND user_id = ?")
    .get(id, userId) as any;
  if (!r) return null;
  return {
    ...r,
    active: toBool(r.active),
    tax_id: maskTaxId(r.tax_id ? decryptField(r.tax_id) : null),
  };
}

export interface ContractorInput {
  full_name: string;
  email: string | null;
  address: string | null;
  tax_id: string | null; // raw; will be encrypted here
  rate: number | null;
  rate_type: Contractor["rate_type"];
  active: boolean;
}

export function createContractor(userId: string, data: ContractorInput): Contractor {
  const id = newId();
  getDb()
    .prepare(
      `INSERT INTO contractors (id, user_id, full_name, email, address, tax_id, rate, rate_type, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      userId,
      data.full_name,
      data.email ?? null,
      data.address ?? null,
      data.tax_id ? encryptField(data.tax_id) : null,
      data.rate ?? null,
      data.rate_type ?? null,
      data.active ? 1 : 0,
    );
  return getContractor(userId, id)!;
}

export function updateContractor(
  userId: string,
  id: string,
  data: ContractorInput,
  updateTaxId: boolean,
): void {
  if (updateTaxId) {
    getDb()
      .prepare(
        `UPDATE contractors SET full_name=?, email=?, address=?, tax_id=?, rate=?, rate_type=?, active=?
         WHERE id=? AND user_id=?`,
      )
      .run(
        data.full_name,
        data.email ?? null,
        data.address ?? null,
        data.tax_id ? encryptField(data.tax_id) : null,
        data.rate ?? null,
        data.rate_type ?? null,
        data.active ? 1 : 0,
        id,
        userId,
      );
  } else {
    getDb()
      .prepare(
        `UPDATE contractors SET full_name=?, email=?, address=?, rate=?, rate_type=?, active=?
         WHERE id=? AND user_id=?`,
      )
      .run(
        data.full_name,
        data.email ?? null,
        data.address ?? null,
        data.rate ?? null,
        data.rate_type ?? null,
        data.active ? 1 : 0,
        id,
        userId,
      );
  }
}

// ----------------------------- Payroll runs --------------------------------

export function listPayrollRuns(userId: string): (PayrollRun & { contractor_name: string })[] {
  const rows = getDb()
    .prepare(
      `SELECT p.*, c.full_name AS contractor_name
       FROM payroll_runs p JOIN contractors c ON c.id = p.contractor_id
       WHERE p.user_id = ? ORDER BY p.period_end DESC, p.created_at DESC`,
    )
    .all(userId) as any[];
  return rows;
}

export function getPayrollRun(userId: string, id: string): PayrollRun | null {
  const r = getDb()
    .prepare("SELECT * FROM payroll_runs WHERE id = ? AND user_id = ?")
    .get(id, userId) as PayrollRun | undefined;
  return r ?? null;
}

export interface PayrollInput {
  contractor_id: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  hours_worked: number | null;
  status: PayrollRun["status"];
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
}

export function createPayrollRun(userId: string, data: PayrollInput): void {
  getDb()
    .prepare(
      `INSERT INTO payroll_runs
        (id, user_id, contractor_id, period_start, period_end, gross_pay, hours_worked, status, paid_at, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId(),
      userId,
      data.contractor_id,
      data.period_start,
      data.period_end,
      data.gross_pay,
      data.hours_worked ?? null,
      data.status,
      data.paid_at ?? null,
      data.payment_method ?? null,
      data.notes ?? null,
    );
}

export function updatePayrollRun(userId: string, id: string, data: PayrollInput): void {
  getDb()
    .prepare(
      `UPDATE payroll_runs SET
        contractor_id=?, period_start=?, period_end=?, gross_pay=?, hours_worked=?,
        status=?, paid_at=?, payment_method=?, notes=?
       WHERE id=? AND user_id=?`,
    )
    .run(
      data.contractor_id,
      data.period_start,
      data.period_end,
      data.gross_pay,
      data.hours_worked ?? null,
      data.status,
      data.paid_at ?? null,
      data.payment_method ?? null,
      data.notes ?? null,
      id,
      userId,
    );
}

export function markPayrollPaid(userId: string, id: string, paidAt: string): void {
  getDb()
    .prepare(
      "UPDATE payroll_runs SET status='paid', paid_at=? WHERE id=? AND user_id=?",
    )
    .run(paidAt, id, userId);
}

export function deletePayrollRun(userId: string, id: string): void {
  getDb().prepare("DELETE FROM payroll_runs WHERE id=? AND user_id=?").run(id, userId);
}

// Total paid per contractor for a given year (1099 threshold reporting).
export function contractorYearlyTotals(
  userId: string,
  year: number,
): { contractor_id: string; contractor_name: string; total: number }[] {
  return getDb()
    .prepare(
      `SELECT p.contractor_id, c.full_name AS contractor_name, COALESCE(SUM(p.gross_pay),0) AS total
       FROM payroll_runs p JOIN contractors c ON c.id = p.contractor_id
       WHERE p.user_id = ? AND p.status = 'paid'
         AND substr(COALESCE(p.paid_at, p.period_end),1,4) = ?
       GROUP BY p.contractor_id, c.full_name
       ORDER BY total DESC`,
    )
    .all(userId, String(year)) as {
    contractor_id: string;
    contractor_name: string;
    total: number;
  }[];
}

export function contractorTotalPaid(userId: string, contractorId: string, year: number): number {
  const r = getDb()
    .prepare(
      `SELECT COALESCE(SUM(gross_pay),0) AS s FROM payroll_runs
       WHERE user_id=? AND contractor_id=? AND status='paid'
         AND substr(COALESCE(paid_at, period_end),1,4) = ?`,
    )
    .get(userId, contractorId, String(year)) as { s: number };
  return r.s;
}

export function payrollForContractor(userId: string, contractorId: string): PayrollRun[] {
  return getDb()
    .prepare(
      "SELECT * FROM payroll_runs WHERE user_id=? AND contractor_id=? ORDER BY period_end DESC",
    )
    .all(userId, contractorId) as PayrollRun[];
}

// ----------------------------- Tax payments --------------------------------

export function listTaxPayments(userId: string, year?: number): TaxPayment[] {
  if (year) {
    return getDb()
      .prepare(
        "SELECT * FROM tax_payments WHERE user_id=? AND tax_year=? ORDER BY quarter, created_at DESC",
      )
      .all(userId, year) as TaxPayment[];
  }
  return getDb()
    .prepare("SELECT * FROM tax_payments WHERE user_id=? ORDER BY tax_year DESC, quarter")
    .all(userId) as TaxPayment[];
}

export interface TaxPaymentInput {
  tax_year: number;
  quarter: 1 | 2 | 3 | 4;
  amount_estimated: number | null;
  amount_paid: number | null;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  irs_confirmation_number: string | null;
  notes: string | null;
}

export function createTaxPayment(userId: string, data: TaxPaymentInput): void {
  getDb()
    .prepare(
      `INSERT INTO tax_payments
        (id, user_id, tax_year, quarter, amount_estimated, amount_paid, due_date, paid_at, payment_method, irs_confirmation_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId(),
      userId,
      data.tax_year,
      data.quarter,
      data.amount_estimated ?? null,
      data.amount_paid ?? null,
      data.due_date ?? null,
      data.paid_at ?? null,
      data.payment_method ?? null,
      data.irs_confirmation_number ?? null,
      data.notes ?? null,
    );
}

export function deleteTaxPayment(userId: string, id: string): void {
  getDb().prepare("DELETE FROM tax_payments WHERE id=? AND user_id=?").run(id, userId);
}

// Total paid per quarter for a year (to compare against estimates on the cards).
export function taxPaidByQuarter(userId: string, year: number): Record<number, number> {
  const rows = getDb()
    .prepare(
      "SELECT quarter, COALESCE(SUM(amount_paid),0) AS total FROM tax_payments WHERE user_id=? AND tax_year=? GROUP BY quarter",
    )
    .all(userId, year) as { quarter: number; total: number }[];
  const out: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const r of rows) out[r.quarter] = r.total;
  return out;
}

// Profile update helpers live here to keep all writes in one module.
export function updateProfile(
  userId: string,
  data: {
    full_name: string | null;
    business_name: string | null;
    tax_filing_status: string | null;
    state: string | null;
  },
): void {
  getDb()
    .prepare(
      "UPDATE users_profile SET full_name=?, business_name=?, tax_filing_status=?, state=? WHERE id=?",
    )
    .run(data.full_name, data.business_name, data.tax_filing_status, data.state, userId);
}

export function updateFedTaxRate(userId: string, rate: number): void {
  getDb().prepare("UPDATE users_profile SET fed_tax_rate=? WHERE id=?").run(rate, userId);
}
