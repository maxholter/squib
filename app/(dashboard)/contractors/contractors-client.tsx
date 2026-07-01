"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, UserX } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Contractor, PayrollStatus } from "@/lib/types";
import { ContractorDialog } from "./contractor-dialog";
import type { ContractorDetail } from "./page";

function statusVariant(status: PayrollStatus): "success" | "warning" | "secondary" {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  return "secondary";
}

function rateLabel(c: Contractor): string {
  if (c.rate == null) return "—";
  return c.rate_type ? `${formatCurrency(c.rate)} / ${c.rate_type}` : formatCurrency(c.rate);
}

export function ContractorsClient({
  contractors,
  details,
  year,
}: {
  contractors: Contractor[];
  details: Record<string, ContractorDetail>;
  year: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [viewing, setViewing] = useState<Contractor | null>(null);
  const [deactivating, setDeactivating] = useState<Contractor | null>(null);

  async function handleDeactivate() {
    if (!deactivating) return;
    const c = deactivating;
    const res = await fetch(`/api/contractors/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: c.full_name,
        email: c.email,
        address: c.address,
        rate: c.rate,
        rate_type: c.rate_type,
        active: false,
      }),
    });
    if (res.ok) {
      toast({ title: "Contractor deactivated", variant: "success" });
      setDeactivating(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error ?? "Could not deactivate", variant: "error" });
    }
  }

  const viewingDetail = viewing ? details[viewing.id] : null;

  return (
    <div>
      <PageHeader title="Contractors" description="People you pay for contract work.">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> Add Contractor
        </Button>
      </PageHeader>

      {contractors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No contractors yet. Click “Add Contractor” to add your first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contractors.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer transition-colors hover:bg-muted/40"
              onClick={() => setViewing(c)}
            >
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{c.full_name}</h3>
                    <p className="truncate text-sm text-muted-foreground">{c.email || "—"}</p>
                  </div>
                  <Badge variant={c.active ? "success" : "secondary"}>
                    {c.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm tabular-nums">{rateLabel(c)}</p>
                <div
                  className="mt-auto flex justify-end gap-1 pt-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(c);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" /> Edit
                  </Button>
                  {c.active && (
                    <Button size="sm" variant="ghost" onClick={() => setDeactivating(c)}>
                      <UserX className="size-4" /> Deactivate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ContractorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editing={editing}
      />

      <Dialog open={!!viewing} onClose={() => setViewing(null)}>
        {viewing && (
          <>
            <DialogHeader>
              <DialogTitle>{viewing.full_name}</DialogTitle>
              <DialogDescription>
                {viewing.active ? "Active contractor" : "Inactive contractor"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Email</span>
                <span className="col-span-2 break-words">{viewing.email || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Address</span>
                <span className="col-span-2 whitespace-pre-wrap">{viewing.address || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Tax ID</span>
                <span className="col-span-2 tabular-nums">{viewing.tax_id || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <span className="text-muted-foreground">Rate</span>
                <span className="col-span-2 tabular-nums">{rateLabel(viewing)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-sm">
              Total paid in {year}:{" "}
              <span className="font-semibold">
                {formatCurrency(viewingDetail?.totalPaid ?? 0)}
              </span>
            </div>

            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium">Payroll runs</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Gross Pay</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewingDetail?.runs.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                          No payroll runs yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      viewingDetail?.runs.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(r.period_start)} – {formatDate(r.period_end)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatCurrency(r.gross_pay)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        onConfirm={handleDeactivate}
        title="Deactivate this contractor?"
        description="They will be marked inactive. You can reactivate them later by editing."
        confirmLabel="Deactivate"
      />
    </div>
  );
}
