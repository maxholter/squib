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
import { todayISO } from "@/lib/format";
import type { Contractor, PayrollRun } from "@/lib/types";

const formSchema = z
  .object({
    contractor_id: z.string().min(1, "Contractor is required."),
    period_start: z.string().min(1, "Start date is required."),
    period_end: z.string().min(1, "End date is required."),
    gross_pay: z.coerce.number().positive("Gross pay must be greater than 0."),
    hours_worked: z.string().optional(),
    payment_method: z.string().optional(),
    status: z.enum(["pending", "paid"]),
    paid_at: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((d) => d.period_end >= d.period_start, {
    message: "End date must be on or after start date.",
    path: ["period_end"],
  });
type FormValues = z.infer<typeof formSchema>;

export function PayrollDialog({
  open,
  onClose,
  contractors,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  contractors: Contractor[];
  editing: (PayrollRun & { contractor_name?: string }) | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  const status = watch("status");

  useEffect(() => {
    if (!open) return;
    reset({
      contractor_id: editing?.contractor_id ?? "",
      period_start: editing?.period_start ?? todayISO(),
      period_end: editing?.period_end ?? todayISO(),
      gross_pay: editing?.gross_pay ?? ("" as unknown as number),
      hours_worked:
        editing?.hours_worked != null ? String(editing.hours_worked) : "",
      payment_method: editing?.payment_method ?? "",
      status: editing?.status === "paid" ? "paid" : "pending",
      paid_at: editing?.paid_at ?? "",
      notes: editing?.notes ?? "",
    });
  }, [open, editing, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      contractor_id: values.contractor_id,
      period_start: values.period_start,
      period_end: values.period_end,
      gross_pay: values.gross_pay,
      hours_worked: values.hours_worked ? Number(values.hours_worked) : null,
      status: values.status,
      paid_at: values.status === "paid" ? values.paid_at || todayISO() : null,
      payment_method: values.payment_method || null,
      notes: values.notes || null,
    };
    const res = await fetch(
      editing ? `/api/payroll/${editing.id}` : "/api/payroll",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (res.ok) {
      toast({
        title: editing ? "Payroll run updated" : "Payroll run added",
        variant: "success",
      });
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
        <DialogTitle>{editing ? "Edit payroll run" : "Add payroll run"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="contractor_id">Contractor</Label>
          <Select id="contractor_id" {...register("contractor_id")}>
            <option value="">Select a contractor…</option>
            {contractors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
          {errors.contractor_id && (
            <p className="text-xs text-destructive">{errors.contractor_id.message}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="period_start">Pay period start</Label>
            <Input id="period_start" type="date" {...register("period_start")} />
            {errors.period_start && (
              <p className="text-xs text-destructive">{errors.period_start.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="period_end">Pay period end</Label>
            <Input id="period_end" type="date" {...register("period_end")} />
            {errors.period_end && (
              <p className="text-xs text-destructive">{errors.period_end.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="gross_pay">Gross pay</Label>
            <Input
              id="gross_pay"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("gross_pay")}
            />
            {errors.gross_pay && (
              <p className="text-xs text-destructive">{errors.gross_pay.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hours_worked">Hours worked</Label>
            <Input
              id="hours_worked"
              type="number"
              step="0.01"
              min="0"
              {...register("hours_worked")}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="payment_method">Payment method</Label>
            <Select id="payment_method" {...register("payment_method")}>
              <option value="">—</option>
              <option value="ACH">ACH</option>
              <option value="check">check</option>
              <option value="wire">wire</option>
              <option value="other">other</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select id="status" {...register("status")}>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
            </Select>
          </div>
        </div>
        {status === "paid" && (
          <div className="space-y-1.5">
            <Label htmlFor="paid_at">Paid date</Label>
            <Input id="paid_at" type="date" {...register("paid_at")} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" {...register("notes")} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editing ? "Save changes" : "Add payroll run"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
