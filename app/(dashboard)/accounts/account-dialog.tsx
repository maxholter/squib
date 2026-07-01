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
import { useToast } from "@/components/ui/toast";
import type { Account } from "@/lib/types";

const ACCOUNT_TYPES = ["checking", "savings", "credit", "other"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Account nickname is required."),
  type: z.enum(ACCOUNT_TYPES),
  institution: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function AccountDialog({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Account | null;
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
      name: editing?.name ?? "",
      type: editing?.type ?? "checking",
      institution: editing?.institution ?? "",
    });
  }, [open, editing, reset]);

  async function onSubmit(values: FormValues) {
    const res = await fetch(
      editing ? `/api/accounts/${editing.id}` : "/api/accounts",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    if (res.ok) {
      toast({ title: editing ? "Account updated" : "Account added", variant: "success" });
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
        <DialogTitle>{editing ? "Edit account" : "Add account"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Account nickname</Label>
          <Input id="name" placeholder="e.g. Business Checking" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Account type</Label>
          <Select id="type" {...register("type")} className="capitalize">
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </Select>
          {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="institution">Institution name</Label>
          <Input id="institution" placeholder="e.g. Chase" {...register("institution")} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editing ? "Save changes" : "Add account"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
