import { requireUser, getProfile } from "@/lib/auth";
import { incomeExpenseTotals, listTaxPayments, taxPaidByQuarter } from "@/lib/data";
import { QUARTERS, estimateTax } from "@/lib/tax";
import { TaxClient } from "./tax-client";

export const dynamic = "force-dynamic";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export default function TaxPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const user = requireUser();
  const profile = getProfile(user.id);
  const now = new Date();
  const parsed = Number(searchParams.year);
  const year =
    Number.isInteger(parsed) && parsed > 1900 ? parsed : now.getFullYear();

  const paidByQuarter = taxPaidByQuarter(user.id, year);

  const quarters = QUARTERS.map((def) => {
    const minMonth = Math.min(...def.months);
    const maxMonth = Math.max(...def.months);
    const from = `${year}-${pad(minMonth + 1)}-01`;
    const lastDay = new Date(year, maxMonth + 1, 0).getDate();
    const to = `${year}-${pad(maxMonth + 1)}-${pad(lastDay)}`;
    const totals = incomeExpenseTotals(user.id, from, to);
    const estimate = estimateTax(
      totals.income,
      totals.deductibleExpenses,
      profile.fed_tax_rate,
    );
    // Strip the dueDate function — Server Components can only pass serializable
    // data to Client Components. The computed dueDate string is passed separately.
    const { dueDate: _fn, ...defData } = def;
    return {
      def: defData,
      estimate,
      dueDate: def.dueDate(year),
      paid: paidByQuarter[def.quarter] ?? 0,
    };
  });

  const payments = listTaxPayments(user.id, year);

  return (
    <TaxClient
      quarters={quarters}
      payments={payments}
      year={year}
      fedRatePct={profile.fed_tax_rate}
    />
  );
}
