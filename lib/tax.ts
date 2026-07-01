// Quarterly estimated-tax logic. These are simplified estimates for a 1099
// sole proprietor — the UI shows every line item and a "consult a professional"
// disclaimer.

export interface QuarterDef {
  quarter: 1 | 2 | 3 | 4;
  label: string;
  monthsLabel: string;
  // Months (0-indexed) that fall in this earning period.
  months: number[];
  dueDate: (taxYear: number) => string; // YYYY-MM-DD
}

// IRS quarterly periods and due dates (Q4 is due Jan 15 of the following year).
export const QUARTERS: QuarterDef[] = [
  {
    quarter: 1,
    label: "Q1",
    monthsLabel: "Jan – Mar",
    months: [0, 1, 2],
    dueDate: (y) => `${y}-04-15`,
  },
  {
    quarter: 2,
    label: "Q2",
    monthsLabel: "Apr – May",
    months: [3, 4],
    dueDate: (y) => `${y}-06-15`,
  },
  {
    quarter: 3,
    label: "Q3",
    monthsLabel: "Jun – Aug",
    months: [5, 6, 7],
    dueDate: (y) => `${y}-09-15`,
  },
  {
    quarter: 4,
    label: "Q4",
    monthsLabel: "Sep – Dec",
    months: [8, 9, 10, 11],
    dueDate: (y) => `${y + 1}-01-15`,
  },
];

export interface TaxEstimate {
  income: number;
  deductibleExpenses: number;
  netProfit: number;
  seTax: number;
  seTaxDeduction: number;
  taxableIncome: number;
  federalIncomeTax: number;
  totalEstimated: number;
  fedRatePct: number;
}

// The formula from the build spec, line by line.
export function estimateTax(
  income: number,
  deductibleExpenses: number,
  fedRatePct: number,
): TaxEstimate {
  const netProfit = Math.max(0, income - deductibleExpenses);
  const seTax = netProfit * 0.9235 * 0.153;
  const seTaxDeduction = seTax * 0.5;
  const taxableIncome = Math.max(0, netProfit - seTaxDeduction);
  const federalIncomeTax = taxableIncome * (fedRatePct / 100);
  const totalEstimated = seTax + federalIncomeTax;
  return {
    income,
    deductibleExpenses,
    netProfit,
    seTax,
    seTaxDeduction,
    taxableIncome,
    federalIncomeTax,
    totalEstimated,
    fedRatePct,
  };
}

export type QuarterStatus = "PAID" | "DUE SOON" | "OVERDUE" | "UPCOMING";

export function quarterStatus(
  dueDate: string,
  amountPaid: number,
  amountEstimated: number,
  now: Date,
): QuarterStatus {
  if (amountPaid > 0 && amountPaid >= amountEstimated - 0.01) return "PAID";
  const due = new Date(dueDate + "T23:59:59");
  const diffDays = (due.getTime() - now.getTime()) / 86400_000;
  if (diffDays < 0) return amountPaid > 0 ? "PAID" : "OVERDUE";
  if (diffDays <= 30) return "DUE SOON";
  return "UPCOMING";
}
