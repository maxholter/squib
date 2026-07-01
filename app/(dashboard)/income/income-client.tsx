"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Account, Transaction } from "@/lib/types";
import { IncomeDialog } from "./income-dialog";

export function IncomeClient({
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
      if (search) {
        const q = search.toLowerCase();
        const hay = [t.client, t.description, t.invoice_number, t.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, search, from, to]);

  const total = filtered.reduce((sum, t) => sum + t.amount, 0);

  async function handleDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/transactions/${deleting.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Income deleted", variant: "success" });
      setDeleting(null);
      router.refresh();
    } else {
      toast({ title: "Could not delete", variant: "error" });
    }
  }

  return (
    <div>
      <PageHeader title="Income" description="Money coming into your business.">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add Income
        </Button>
      </PageHeader>

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search client, description, invoice…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No income entries yet. Click “Add Income” to record your first one.
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
                  <TableCell>{t.client || "—"}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{t.description || "—"}</TableCell>
                  <TableCell>{t.invoice_number || "—"}</TableCell>
                  <TableCell>{t.account_id ? accountName[t.account_id] ?? "—" : "—"}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-success">
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

      <IncomeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        accounts={accounts}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this income entry?"
        description="This cannot be undone."
      />
    </div>
  );
}
