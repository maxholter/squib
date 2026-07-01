"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, todayISO } from "@/lib/format";

const PAYMENT_METHODS = ["EFTPS", "check", "debit card"] as const;

const formSchema = z.object({
  amount_paid: z.coerce.number().positive("Amount must be greater than 0."),
  paid_at: z.string().min(1, "Date is required."),
  payment_method: z.string().optional(),
  irs_confirmation_number: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function LogPaymentDialog({
  open,
  onClose,
  taxYear,
  quarter,
  dueDate,
  amountEstimated,
}: {
  open: boolean;
  onClose: () => void;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
  dueDate: string;
  amountEstimated: number;
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
      amount_paid: ("" as unknown as number),
      paid_at: todayISO(),
      payment_method: "EFTPS",
      irs_confirmation_number: "",
      notes: "",
    });
  }, [open, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      tax_year: taxYear,
      quarter,
      amount_estimated: amountEstimated,
      amount_paid: values.amount_paid,
      due_date: dueDate,
      paid_at: values.paid_at,
      payment_method: values.payment_method,
      irs_confirmation_number: values.irs_confirmation_number,
      notes: values.notes,
    };
    const res = await fetch("/api/tax-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast({ title: "Payment logged", variant: "success" });
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
        <DialogTitle>Log Q{quarter} {taxYear} payment</DialogTitle>
        <DialogDescription>
          Due {formatDate(dueDate)} · Estimated {formatCurrency(amountEstimated)}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="tax_year">Year</Label>
            <Input id="tax_year" value={taxYear} disabled readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="quarter">Quarter</Label>
            <Input id="quarter" value={`Q${quarter}`} disabled readOnly />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount_paid">Amount paid</Label>
            <Input
              id="amount_paid"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("amount_paid")}
            />
            {errors.amount_paid && (
              <p className="text-xs text-destructive">{errors.amount_paid.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paid_at">Date paid</Label>
            <Input id="paid_at" type="date" {...register("paid_at")} />
            {errors.paid_at && (
              <p className="text-xs text-destructive">{errors.paid_at.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payment_method">Payment method</Label>
          <Select id="payment_method" {...register("payment_method")}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="irs_confirmation_number">IRS confirmation number</Label>
          <Input id="irs_confirmation_number" {...register("irs_confirmation_number")} />
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
            {isSubmitting ? "Saving…" : "Log payment"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
