"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { US_STATES, type UserProfile } from "@/lib/types";

const FILING_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married_filing_jointly", label: "Married filing jointly" },
  { value: "married_filing_separately", label: "Married filing separately" },
  { value: "head_of_household", label: "Head of household" },
] as const;

export function SettingsClient({ profile }: { profile: UserProfile }) {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your profile, tax settings, and data exports." />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="tax">Tax Settings</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab profile={profile} />
        </TabsContent>
        <TabsContent value="tax">
          <TaxTab profile={profile} />
        </TabsContent>
        <TabsContent value="export">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  full_name: z.string().optional(),
  business_name: z.string().optional(),
  tax_filing_status: z.string().optional(),
  state: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

function ProfileTab({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name ?? "",
      business_name: profile.business_name ?? "",
      tax_filing_status: profile.tax_filing_status ?? "",
      state: profile.state ?? "",
    },
  });

  async function onSubmit(values: ProfileValues) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: values.full_name,
        business_name: values.business_name,
        tax_filing_status: values.tax_filing_status || null,
        state: values.state || null,
      }),
    });
    if (res.ok) {
      toast({ title: "Profile saved", variant: "success" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error ?? "Could not save profile", variant: "error" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your personal and business details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...register("full_name")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="business_name">Business name</Label>
            <Input id="business_name" {...register("business_name")} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tax_filing_status">Tax filing status</Label>
              <Select id="tax_filing_status" {...register("tax_filing_status")}>
                <option value="">—</option>
                {FILING_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State of residence</Label>
              <Select id="state" {...register("state")}>
                <option value="">—</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tax Settings
// ---------------------------------------------------------------------------

const taxSchema = z.object({
  fed_tax_rate: z.coerce.number().min(10).max(37),
});
type TaxValues = z.infer<typeof taxSchema>;

function TaxTab({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<TaxValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: { fed_tax_rate: profile.fed_tax_rate },
  });

  const current = watch("fed_tax_rate");

  async function onSubmit(values: TaxValues) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "tax_rate", fed_tax_rate: values.fed_tax_rate }),
    });
    if (res.ok) {
      toast({ title: "Tax settings saved", variant: "success" });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error ?? "Could not save tax settings", variant: "error" });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Settings</CardTitle>
        <CardDescription>Fine-tune how PayTrack estimates your federal income tax.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="fed_tax_rate">Federal income tax rate override</Label>
              <span className="text-sm font-semibold tabular-nums">{Number(current) || 0}%</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={37}
                step={1}
                className="flex-1 accent-primary"
                {...register("fed_tax_rate")}
              />
              <div className="flex w-24 items-center gap-1">
                <Input
                  id="fed_tax_rate"
                  type="number"
                  min={10}
                  max={37}
                  step={1}
                  {...register("fed_tax_rate")}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This rate is used to estimate your federal income tax in the Tax Tracker. The Tax Tracker
            applies it to your taxable income (net profit minus the self-employment tax deduction). The
            default of 22% suits many sole proprietors, but adjust it to match your bracket.
          </p>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function ExportTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function transactionsHref() {
    const params = new URLSearchParams({ type: "transactions" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/export?${params.toString()}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export</CardTitle>
        <CardDescription>Download your data as CSV files.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">Transactions</h3>
            <p className="text-sm text-muted-foreground">
              All income and expense entries. Optionally filter by a date range.
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="export-from">From</Label>
              <Input
                id="export-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-to">To</Label>
              <Input
                id="export-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <a
              href={transactionsHref()}
              download
              className={cn(buttonVariants({ variant: "outline" }), "sm:ml-auto")}
            >
              <Download className="size-4" /> Download
            </a>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">Payroll runs</h3>
            <p className="text-sm text-muted-foreground">Every payroll run and its status.</p>
          </div>
          <a
            href="/api/export?type=payroll"
            download
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Download className="size-4" /> Download
          </a>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium">Tax payment log</h3>
            <p className="text-sm text-muted-foreground">
              Your recorded estimated tax payments.
            </p>
          </div>
          <a
            href="/api/export?type=tax-payments"
            download
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Download className="size-4" /> Download
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
