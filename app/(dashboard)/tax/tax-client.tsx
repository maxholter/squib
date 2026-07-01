"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { quarterStatus, type QuarterDef, type QuarterStatus, type TaxEstimate } from "@/lib/tax";
import type { TaxPayment } from "@/lib/types";
import { YearSelect } from "./year-select";
import { LogPaymentDialog } from "./log-payment-dialog";

interface QuarterData {
  def: Omit<QuarterDef, "dueDate">;
  estimate: TaxEstimate;
  dueDate: string;
  paid: number;
}

const STATUS_VARIANT: Record<QuarterStatus, "success" | "warning" | "destructive" | "secondary"> = {
  PAID: "success",
  "DUE SOON": "warning",
  OVERDUE: "destructive",
  UPCOMING: "secondary",
};

export function TaxClient({
  quarters,
  payments,
  year,
  fedRatePct,
}: {
  quarters: QuarterData[];
  payments: TaxPayment[];
  year: number;
  fedRatePct: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const now = new Date();

  // Default the breakdown to the quarter containing today's month, else Q1.
  const currentMonth = now.getMonth();
  const defaultIndex = Math.max(
    0,
    quarters.findIndex((q) => q.def.months.includes(currentMonth)),
  );
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const [logging, setLogging] = useState<QuarterData | null>(null);
  const [deleting, setDeleting] = useState<TaxPayment | null>(null);

  const selected = quarters[selectedIndex];

  async function handleDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/tax-payments/${deleting.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Payment deleted", variant: "success" });
      setDeleting(null);
      router.refresh();
    } else {
      toast({ title: "Could not delete", variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader title="Tax Tracker" description="Quarterly estimated federal taxes.">
        <YearSelect year={year} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quarters.map((q, i) => {
          const status = quarterStatus(
            q.dueDate,
            q.paid,
            q.estimate.totalEstimated,
            now,
          );
          return (
            <Card
              key={q.def.quarter}
              className={
                "cursor-pointer transition-colors" +
                (i === selectedIndex ? " ring-2 ring-ring" : "")
              }
              onClick={() => setSelectedIndex(i)}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-base font-semibold">
                      {q.def.label}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {q.def.monthsLabel}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Due {formatDate(q.dueDate)}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Estimated tax owed</div>
                  <div className="text-2xl font-bold tabular-nums">
                    {formatCurrency(q.estimate.totalEstimated)}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Paid: </span>
                  <span className="font-medium tabular-nums">{formatCurrency(q.paid)}</span>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLogging(q);
                  }}
                >
                  Log Payment
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selected && (
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold">
                How this is calculated · {selected.def.label} ({selected.def.monthsLabel})
              </h2>
              <span className="text-xs text-muted-foreground">Federal estimate</span>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Income</dt>
                <dd className="tabular-nums">{formatCurrency(selected.estimate.income)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Deductible expenses</dt>
                <dd className="tabular-nums">
                  − {formatCurrency(selected.estimate.deductibleExpenses)}
                </dd>
              </div>
              <div className="flex items-center justify-between font-medium">
                <dt>Net profit (income − deductible expenses)</dt>
                <dd className="tabular-nums">{formatCurrency(selected.estimate.netProfit)}</dd>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  Self-employment tax (net profit × 0.9235 × 15.3%)
                </dt>
                <dd className="tabular-nums">{formatCurrency(selected.estimate.seTax)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">SE tax deduction (½ of SE tax)</dt>
                <dd className="tabular-nums">
                  − {formatCurrency(selected.estimate.seTaxDeduction)}
                </dd>
              </div>
              <div className="flex items-center justify-between font-medium">
                <dt>Taxable income</dt>
                <dd className="tabular-nums">
                  {formatCurrency(selected.estimate.taxableIncome)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  Federal income tax estimate (@ {fedRatePct}%)
                </dt>
                <dd className="tabular-nums">
                  {formatCurrency(selected.estimate.federalIncomeTax)}
                </dd>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-base font-bold">
                <dt>Total estimated</dt>
                <dd className="tabular-nums">
                  {formatCurrency(selected.estimate.totalEstimated)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-2 mt-6 text-sm font-semibold">Payment history</h2>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quarter</TableHead>
                <TableHead className="text-right">Amount paid</TableHead>
                <TableHead>Date paid</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>IRS confirmation #</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No payments logged for {year} yet.
                  </TableCell>
                </TableRow>
              )}
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>Q{p.quarter}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(p.amount_paid)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(p.paid_at)}</TableCell>
                  <TableCell>{p.payment_method || "—"}</TableCell>
                  <TableCell>{p.irs_confirmation_number || "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(p)}
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        These are estimates only. Consult a tax professional for your actual tax liability.
      </p>

      {logging && (
        <LogPaymentDialog
          open={!!logging}
          onClose={() => setLogging(null)}
          taxYear={year}
          quarter={logging.def.quarter}
          dueDate={logging.dueDate}
          amountEstimated={logging.estimate.totalEstimated}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this payment?"
        description="This cannot be undone."
      />
    </div>
  );
}
