import { format, parseISO } from "date-fns";

export function formatCurrency(value: number | null | undefined): string {
  const n = value ?? 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrencyShort(value: number | null | undefined): string {
  const n = value ?? 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// Format a YYYY-MM-DD (or ISO) string without timezone drift.
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = value.length <= 10 ? parseISO(value + "T00:00:00") : parseISO(value);
    return format(d, "MMM d, yyyy");
  } catch {
    return value;
  }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
