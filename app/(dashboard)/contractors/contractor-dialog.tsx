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
import type { Contractor } from "@/lib/types";

const formSchema = z.object({
  full_name: z.string().min(1, "Name is required."),
  email: z.string().optional(),
  address: z.string().optional(),
  tax_id: z.string().optional(),
  rate: z.string().optional(),
  rate_type: z.string().optional(),
  active: z.boolean().default(true),
});
type FormValues = z.infer<typeof formSchema>;

export function ContractorDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Contractor | null;
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
      full_name: editing?.full_name ?? "",
      email: editing?.email ?? "",
      address: editing?.address ?? "",
      tax_id: "", // never prefill — the raw value never leaves the server
      rate: editing?.rate != null ? String(editing.rate) : "",
      rate_type: editing?.rate_type ?? "",
      active: editing ? editing.active : true,
    });
  }, [open, editing, reset]);

  async function onSubmit(values: FormValues) {
    const payload: Record<string, unknown> = {
      full_name: values.full_name,
      email: values.email,
      address: values.address,
      rate: values.rate,
      rate_type: values.rate_type,
      active: values.active,
    };
    // Only send tax_id when the user actually typed a new value.
    const typed = values.tax_id?.trim();
    if (typed && !typed.includes("•")) {
      payload.tax_id = typed;
    }

    const res = await fetch(
      editing ? `/api/contractors/${editing.id}` : "/api/contractors",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (res.ok) {
      toast({ title: editing ? "Contractor updated" : "Contractor added", variant: "success" });
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
        <DialogTitle>{editing ? "Edit contractor" : "Add contractor"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" {...register("full_name")} />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" placeholder="Used on 1099 forms" {...register("address")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tax_id">
            Tax ID / EIN / SSN{" "}
            <span className="font-normal text-muted-foreground">· sensitive</span>
          </Label>
          <Input
            id="tax_id"
            placeholder={editing ? "Leave blank to keep current" : "e.g. 12-3456789"}
            {...register("tax_id")}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="rate">Default rate</Label>
            <Input id="rate" type="number" step="0.01" min="0" placeholder="0.00" {...register("rate")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rate_type">Rate type</Label>
            <Select id="rate_type" {...register("rate_type")}>
              <option value="">—</option>
              <option value="hourly">hourly</option>
              <option value="salary">salary</option>
              <option value="project">project</option>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            className="size-4 rounded border-input"
            {...register("active")}
          />
          <Label htmlFor="active" className="cursor-pointer">
            Active
          </Label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editing ? "Save changes" : "Add contractor"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
