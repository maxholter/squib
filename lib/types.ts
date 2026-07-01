// Application types. These mirror the SQL schema in CLAUDE_BUILD_INSTRUCTIONS.md
// so that moving to Supabase/Postgres later is a drop-in change.

export type TaxFilingStatus =
  | "single"
  | "married_filing_jointly"
  | "married_filing_separately"
  | "head_of_household";

export interface UserProfile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  tax_filing_status: TaxFilingStatus | null;
  state: string | null;
  fed_tax_rate: number; // percent, e.g. 22 — federal income tax estimate override
  created_at: string;
}

export type AccountType = "checking" | "savings" | "credit" | "other";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  created_at: string;
}

export type RateType = "hourly" | "salary" | "project";

export interface Contractor {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  address: string | null;
  tax_id: string | null; // stored encrypted at rest; never sent to the client
  rate: number | null;
  rate_type: RateType | null;
  active: boolean;
  created_at: string;
}

export type TransactionType = "income" | "expense";
export type TransactionSource = "manual" | "plaid";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string | null;
  category: string;
  vendor: string | null;
  client: string | null;
  invoice_number: string | null;
  payment_method: string | null;
  is_deductible: boolean;
  notes: string | null;
  source: TransactionSource;
  plaid_transaction_id: string | null;
  created_at: string;
}

export type PayrollStatus = "pending" | "paid" | "cancelled";

export interface PayrollRun {
  id: string;
  user_id: string;
  contractor_id: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  hours_worked: number | null;
  status: PayrollStatus;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface TaxPayment {
  id: string;
  user_id: string;
  tax_year: number;
  quarter: 1 | 2 | 3 | 4;
  amount_estimated: number | null;
  amount_paid: number | null;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  irs_confirmation_number: string | null;
  notes: string | null;
  created_at: string;
}

// IRS Schedule C expense categories.
export const EXPENSE_CATEGORIES = [
  "Advertising",
  "Car & Truck",
  "Commissions & Fees",
  "Contract Labor",
  "Depreciation",
  "Employee Benefits",
  "Insurance",
  "Legal & Professional",
  "Office Expense",
  "Rent & Lease",
  "Repairs & Maintenance",
  "Supplies",
  "Taxes & Licenses",
  "Travel",
  "Meals (50% deductible)",
  "Utilities",
  "Wages",
  "Other",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// Categories that typically are NOT fully deductible / default the toggle off.
export const NON_DEDUCTIBLE_DEFAULT: string[] = [];

export const PAYMENT_METHODS = ["check", "ACH", "wire", "cash", "other"] as const;

export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
] as const;
