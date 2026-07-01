import { z } from "zod";
import { EXPENSE_CATEGORIES } from "./types";

const nullableStr = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.string().nullable(),
);
const nullableNum = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().nullable(),
);

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  date: z.string().min(1, "Date is required."),
  account_id: nullableStr,
  description: nullableStr,
  category: z.string().min(1, "Category is required."),
  vendor: nullableStr,
  client: nullableStr,
  invoice_number: nullableStr,
  payment_method: nullableStr,
  is_deductible: z.coerce.boolean().default(false),
  notes: nullableStr,
});

export const expenseCategorySchema = z.enum(
  EXPENSE_CATEGORIES as unknown as [string, ...string[]],
);

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required."),
  type: z.enum(["checking", "savings", "credit", "other"]),
  institution: nullableStr,
});

export const contractorSchema = z.object({
  full_name: z.string().min(1, "Name is required."),
  email: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.string().email("Invalid email.").nullable(),
  ),
  address: nullableStr,
  tax_id: nullableStr,
  rate: nullableNum,
  rate_type: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(["hourly", "salary", "project"]).nullable(),
  ),
  active: z.coerce.boolean().default(true),
});

export const payrollSchema = z
  .object({
    contractor_id: z.string().min(1, "Contractor is required."),
    period_start: z.string().min(1, "Start date is required."),
    period_end: z.string().min(1, "End date is required."),
    gross_pay: z.coerce.number().positive("Gross pay must be greater than 0."),
    hours_worked: nullableNum,
    status: z.enum(["pending", "paid", "cancelled"]).default("pending"),
    paid_at: nullableStr,
    payment_method: nullableStr,
    notes: nullableStr,
  })
  .refine((d) => d.period_end >= d.period_start, {
    message: "End date must be on or after start date.",
    path: ["period_end"],
  });

export const taxPaymentSchema = z.object({
  tax_year: z.coerce.number().int(),
  quarter: z.coerce.number().int().min(1).max(4),
  amount_estimated: nullableNum,
  amount_paid: nullableNum,
  due_date: nullableStr,
  paid_at: nullableStr,
  payment_method: nullableStr,
  irs_confirmation_number: nullableStr,
  notes: nullableStr,
});

export const profileSchema = z.object({
  full_name: nullableStr,
  business_name: nullableStr,
  tax_filing_status: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z
      .enum([
        "single",
        "married_filing_jointly",
        "married_filing_separately",
        "head_of_household",
      ])
      .nullable(),
  ),
  state: nullableStr,
});

export const taxRateSchema = z.object({
  fed_tax_rate: z.coerce.number().min(10).max(37),
});
