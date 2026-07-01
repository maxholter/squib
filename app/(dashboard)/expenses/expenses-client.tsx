"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { EXPENSE_CATEGORIES, type Account, type Transaction } from "@/lib/types";
import { ExpenseDialog } from "./expense-dialog";
import { ExpensesDonut, DONUT_COLORS } from "./expenses-donut";

export function ExpensesClient({
  transactions,
  accounts,
}: {
  transactions: Transaction[];
  accounts: Account[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const accountName = useMemo(
    () => Object.fromEntries(accounts.map((a) => [a.id, a.name])),
    [accounts],
  );

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (category && t.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [t.vendor, t.description, t.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, search, from, to, category]);

  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of filtered) {
      totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
    }
    return Array.from(totals.entries())
      .map(([cat, amount]) => ({ category: cat, total: amount }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  async function handleDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/transactions/${deleting.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Expense deleted", variant: "success" });
      setDeleting(null);
      router.refresh();
    } else {
      toast({ title: "Could not delete", variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader title="Expenses" description="Money going out of your business.">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add Expense
        </Button>
      </PageHeader>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendor, description, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Category</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Deductible</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        No expenses yet. Click “Add Expense” to record your first one.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setEditing(t);
                        setDialogOpen(true);
                      }}
                    >
                      <TableCell className="whitespace-nowrap">{formatDate(t.date)}</TableCell>
                      <TableCell>{t.vendor || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{t.category}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{t.description || "—"}</TableCell>
                      <TableCell>{t.account_id ? accountName[t.account_id] ?? "—" : "—"}</TableCell>
                      <TableCell>
                        {t.is_deductible ? (
                          <Badge variant="success">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-destructive">
                        {formatCurrency(t.amount)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditing(t);
                              setDialogOpen(true);
                            }}
                            aria-label="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleting(t)}
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

          <div className="mt-3 flex justify-end px-1 text-sm text-muted-foreground">
            <span>
              {filtered.length} entr{filtered.length === 1 ? "y" : "ies"} · Total{" "}
              <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
            </span>
          </div>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>By category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ExpensesDonut data={byCategory} />
              <div className="space-y-1.5">
                {byCategory.map((row, i) => (
                  <div key={row.category} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="truncate">{row.category}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(row.total)}
                    </span>
                  </div>
                ))}
                {byCategory.length === 0 && (
                  <p className="text-sm text-muted-foreground">No expenses to summarize.</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums text-destructive">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        accounts={accounts}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this expense?"
        description="This cannot be undone."
      />
    </div>
  );
}
