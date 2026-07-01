"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import type { Contractor, PayrollRun, PayrollStatus } from "@/lib/types";
import { PayrollDialog } from "./payroll-dialog";

type PayrollRow = PayrollRun & { contractor_name: string };
type YearlyTotal = { contractor_id: string; contractor_name: string; total: number };

const STATUS_VARIANT: Record<PayrollStatus, "success" | "warning" | "secondary"> = {
  paid: "success",
  pending: "warning",
  cancelled: "secondary",
};

export function PayrollClient({
  runs,
  contractors,
  yearlyTotals,
  year,
}: {
  runs: PayrollRow[];
  contractors: Contractor[];
  yearlyTotals: YearlyTotal[];
  year: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [contractorFilter, setContractorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollRow | null>(null);
  const [deleting, setDeleting] = useState<PayrollRow | null>(null);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (contractorFilter && r.contractor_id !== contractorFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      return true;
    });
  }, [runs, contractorFilter, statusFilter]);

  async function handleDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/payroll/${deleting.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Payroll run deleted", variant: "success" });
      setDeleting(null);
      router.refresh();
    } else {
      toast({ title: "Could not delete", variant: "error" });
    }
  }

  async function handleMarkPaid(run: PayrollRow) {
    const res = await fetch(`/api/payroll/${run.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_paid", paid_at: todayISO() }),
    });
    if (res.ok) {
      toast({ title: "Marked as paid", variant: "success" });
      router.refresh();
    } else {
      toast({ title: "Could not update", variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader title="Payroll" description="Contractor pay runs and 1099 tracking.">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add Payroll Run
        </Button>
      </PageHeader>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Contractor</label>
            <Select value={contractorFilter} onChange={(e) => setContractorFilter(e.target.value)}>
              <option value="">All contractors</option>
              {contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Status</label>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="cancelled">cancelled</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No payroll runs yet. Click “Add Payroll Run” to record your first one.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => {
                    setEditing(r);
                    setDialogOpen(true);
                  }}
                >
                  <TableCell className="whitespace-nowrap">
                    {formatDate(r.period_start)} – {formatDate(r.period_end)}
                  </TableCell>
                  <TableCell>{r.contractor_name}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(r.gross_pay)}
                  </TableCell>
                  <TableCell>{r.hours_worked ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(r.paid_at)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      {r.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaid(r)}>
                          Mark as Paid
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditing(r);
                          setDialogOpen(true);
                        }}
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleting(r)}
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

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Contractor Totals — {year}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contractor</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearlyTotals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No paid runs recorded for {year}.
                  </TableCell>
                </TableRow>
              )}
              {yearlyTotals.map((t) => (
                <TableRow key={t.contractor_id}>
                  <TableCell>{t.contractor_name}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrency(t.total)}
                  </TableCell>
                  <TableCell>
                    {t.total >= 600 && <Badge variant="warning">1099 required</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PayrollDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        contractors={contractors}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this payroll run?"
        description="This cannot be undone."
      />
    </div>
  );
}
