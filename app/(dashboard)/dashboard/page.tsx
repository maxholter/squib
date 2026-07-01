import { requireUser, getProfile } from "@/lib/auth";
import { incomeExpenseTotals, monthlyTotals, listTransactions, taxPaidByQuarter } from "@/lib/data";
import { QUARTERS, estimateTax, quarterStatus, type QuarterStatus } from "@/lib/tax";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardChart } from "./dashboard-chart";

export const dynamic = "force-dynamic";

// Build an inclusive YYYY-MM-DD range covering the given 0-indexed months of a year.
function monthsRange(year: number, months: number[]): { start: string; end: string } {
  const min = Math.min(...months);
  const max = Math.max(...months);
  const startD = new Date(year, min, 1);
  const endD = new Date(year, max + 1, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { start: iso(startD), end: iso(endD) };
}

const statusBadgeVariant: Record<QuarterStatus, "destructive" | "warning" | "secondary"> = {
  OVERDUE: "destructive",
  "DUE SOON": "warning",
  UPCOMING: "secondary",
  PAID: "secondary",
};

export default function DashboardPage() {
  const user = requireUser();
  const profile = getProfile(user.id);

  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  // --- This month ---
  const monthRange = monthsRange(year, [monthIndex]);
  const month = incomeExpenseTotals(user.id, monthRange.start, monthRange.end);
  const netProfit = month.income - month.expenses;

  // --- Estimated tax this quarter ---
  const currentQuarter =
    QUARTERS.find((q) => q.months.includes(monthIndex)) ?? QUARTERS[0];
  const qRange = monthsRange(year, currentQuarter.months);
  const qTotals = incomeExpenseTotals(user.id, qRange.start, qRange.end);
  const quarterTax = estimateTax(
    qTotals.income,
    qTotals.deductibleExpenses,
    profile.fed_tax_rate,
  );

  // --- Chart data ---
  const monthly = monthlyTotals(user.id, 6);

  // --- Recent transactions ---
  const recent = listTransactions(user.id, {}).slice(0, 10);

  // --- Payments due soon ---
  const paidByQuarter = taxPaidByQuarter(user.id, year);
  const pending = QUARTERS.map((q) => {
    const range = monthsRange(year, q.months);
    const totals = incomeExpenseTotals(user.id, range.start, range.end);
    const estimate = estimateTax(
      totals.income,
      totals.deductibleExpenses,
      profile.fed_tax_rate,
    );
    const dueDate = q.dueDate(year);
    const paid = paidByQuarter[q.quarter] ?? 0;
    const status = quarterStatus(dueDate, paid, estimate.totalEstimated, now);
    return { q, dueDate, estimate, status };
  }).filter((p) => p.status !== "PAID");

  const summaryCards = [
    { label: "Income (this month)", value: formatCurrency(month.income), tone: "text-success" },
    {
      label: "Expenses (this month)",
      value: formatCurrency(month.expenses),
      tone: "text-destructive",
    },
    {
      label: "Net profit (this month)",
      value: formatCurrency(netProfit),
      tone: netProfit >= 0 ? "text-success" : "text-destructive",
    },
    {
      label: `Est. tax owed (${currentQuarter.label})`,
      value: formatCurrency(quarterTax.totalEstimated),
      tone: "text-foreground",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A snapshot of your income, expenses, and estimated taxes."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescription>{c.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tabular-nums ${c.tone}`}>{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Income vs Expenses (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardChart data={monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments due soon</CardTitle>
            <CardDescription>Estimated quarterly taxes for {year}.</CardDescription>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                You&apos;re all caught up. No estimated payments pending.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pending.map((p) => (
                  <li
                    key={p.q.quarter}
                    className="flex items-center justify-between gap-2 border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">
                        {p.q.label}{" "}
                        <span className="text-muted-foreground">({p.q.monthsLabel})</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Due {formatDate(p.dueDate)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums">
                        {formatCurrency(p.estimate.totalEstimated)}
                      </span>
                      <Badge variant={statusBadgeVariant[p.status]}>{p.status}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>Your 10 most recent entries.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="pr-6 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No transactions yet.
                  </TableCell>
                </TableRow>
              )}
              {recent.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap pl-6">{formatDate(t.date)}</TableCell>
                  <TableCell className="max-w-[280px] truncate">
                    {t.description || t.vendor || t.client || "—"}
                  </TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell
                    className={`pr-6 text-right font-medium tabular-nums ${
                      t.type === "income" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatCurrency(t.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
