"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/format";
import type { Account } from "@/lib/types";
import { AccountDialog } from "./account-dialog";

type Totals = Record<string, { income: number; expense: number }>;

export function AccountsClient({
  accounts,
  totals,
  counts,
}: {
  accounts: Account[];
  totals: Totals;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);

  async function handleDelete() {
    if (!deleting) return;
    const res = await fetch(`/api/accounts/${deleting.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: "Account deleted", variant: "success" });
      setDeleting(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error ?? "Could not delete", variant: "error" });
      setDeleting(null);
    }
  }

  return (
    <div>
      <PageHeader title="Accounts" description="Organize your transactions by where the money lives.">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add Account
        </Button>
      </PageHeader>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Wallet className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No accounts yet. Click “Add Account” to create your first one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            const income = totals[a.id]?.income ?? 0;
            const expense = totals[a.id]?.expense ?? 0;
            const net = income - expense;
            const count = counts[a.id] ?? 0;
            return (
              <Card key={a.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="space-y-1">
                    <CardTitle>{a.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{a.institution || "—"}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {a.type}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    {count} transaction{count === 1 ? "" : "s"}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Income</span>
                    <span className="font-medium tabular-nums text-success">
                      {formatCurrency(income)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expense</span>
                    <span className="font-medium tabular-nums text-destructive">
                      {formatCurrency(expense)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2 text-sm">
                    <span className="text-muted-foreground">Net</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(net)}</span>
                  </div>
                  <div className="mt-auto flex justify-end gap-1 pt-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditing(a);
                        setDialogOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleting(a)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        We don&apos;t store account numbers — accounts are just labels for organizing your
        transactions.
      </p>

      <AccountDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editing={editing} />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete this account?"
        description="This cannot be undone."
      />
    </div>
  );
}
