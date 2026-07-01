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
import { EXPENSE_CATEGORIES, type Account, type Transaction } from "@/lib/types";
import { todayISO } from "@/lib/format";

const formSchema = z.object({
  date: z.string().min(1, "Date is required."),
  amount: z.coerce.number().positive("Amount must be greater than 0."),
  vendor: z.string().optional(),
  category: z.string().min(1, "Category is required."),
  description: z.string().optional(),
  account_id: z.string().optional(),
  is_deductible: z.boolean().default(true),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function ExpenseDialog({
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
      vendor: editing?.vendor ?? "",
      category: editing?.category ?? "",
      description: editing?.description ?? "",
      account_id: editing?.account_id ?? "",
      is_deductible: editing ? editing.is_deductible : true,
      notes: editing?.notes ?? "",
    });
  }, [open, editing, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      type: "expense",
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
      toast({ title: editing ? "Expense updated" : "Expense added", variant: "success" });
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
        <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
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
          <Label htmlFor="vendor">Vendor</Label>
          <Input id="vendor" {...register("vendor")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select id="category" {...register("category")}>
            <option value="">Select a category…</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input id="description" {...register("description")} />
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
        <div className="flex items-center gap-2">
          <input
            id="is_deductible"
            type="checkbox"
            className="size-4 rounded border-input accent-primary"
            {...register("is_deductible")}
          />
          <Label htmlFor="is_deductible">Is this deductible?</Label>
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
            {isSubmitting ? "Saving…" : editing ? "Save changes" : "Add expense"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
