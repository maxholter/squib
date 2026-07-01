"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_METHODS, type Account, type Transaction } from "@/lib/types";
import { todayISO } from "@/lib/format";

const formSchema = z.object({
  date: z.string().min(1, "Date is required."),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  client: z.string().optional(),
  description: z.string().optional(),
  invoice_number: z.string().optional(),
  account_id: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function IncomeDialog({
  open,
  onClose,
  accounts,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  editing: Transaction | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      date: editing?.date ?? todayISO(),
      amount: editing?.amount ?? ("" as unknown as number),
      client: editing?.client ?? "",
      description: editing?.description ?? "",
      invoice_number: editing?.invoice_number ?? "",
      account_id: editing?.account_id ?? "",
      payment_method: editing?.payment_method ?? "",
      notes: editing?.notes ?? "",
    });
  }, [open, editing, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      type: "income",
      category: "Income",
      is_deductible: false,
    };
    const res = await fetch(
      editing ? `/api/transactions/${editing.id}` : "/api/transactions",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (res.ok) {
      toast({ title: editing ? "Income updated" : "Income added", variant: "success" });
      onClose();
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error ?? "Something went wrong", variant: "error" });
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit income" : "Add income"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="0.01" min="0" placeholder="0.00" {...register("amount")} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="client">Client</Label>
          <Input id="client" {...register("client")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input id="description" {...register("description")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="invoice_number">Invoice #</Label>
            <Input id="invoice_number" {...register("invoice_number")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment_method">Payment method</Label>
            <Select id="payment_method" {...register("payment_method")}>
              <option value="">—</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="account_id">Account</Label>
          <Select id="account_id" {...register("account_id")}>
            <option value="">—</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register("notes")} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editing ? "Save changes" : "Add income"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
