import { requireUserApi } from "@/lib/auth";
import {
  listTransactions,
  listPayrollRuns,
  listTaxPayments,
} from "@/lib/data";

export const runtime = "nodejs";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: (unknown[])[]): string {
  return [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
}

export async function GET(req: Request) {
  const user = requireUserApi();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "transactions";
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  let csv = "";
  let filename = "export.csv";

  if (type === "transactions") {
    const rows = listTransactions(user.id, { from, to });
    csv = toCsv(
      ["Date", "Type", "Category", "Description", "Vendor", "Client", "Invoice #", "Payment Method", "Deductible", "Amount"],
      rows.map((t) => [
        t.date, t.type, t.category, t.description, t.vendor, t.client,
        t.invoice_number, t.payment_method, t.is_deductible ? "Yes" : "No", t.amount,
      ]),
    );
    filename = "transactions.csv";
  } else if (type === "payroll") {
    const rows = listPayrollRuns(user.id);
    csv = toCsv(
      ["Period Start", "Period End", "Contractor", "Gross Pay", "Hours", "Status", "Paid Date", "Payment Method", "Notes"],
      rows.map((p) => [
        p.period_start, p.period_end, p.contractor_name, p.gross_pay,
        p.hours_worked, p.status, p.paid_at, p.payment_method, p.notes,
      ]),
    );
    filename = "payroll.csv";
  } else if (type === "tax-payments") {
    const rows = listTaxPayments(user.id);
    csv = toCsv(
      ["Tax Year", "Quarter", "Estimated", "Paid", "Due Date", "Paid Date", "Payment Method", "IRS Confirmation", "Notes"],
      rows.map((p) => [
        p.tax_year, `Q${p.quarter}`, p.amount_estimated, p.amount_paid,
        p.due_date, p.paid_at, p.payment_method, p.irs_confirmation_number, p.notes,
      ]),
    );
    filename = "tax-payments.csv";
  } else {
    return new Response("Unknown export type", { status: 400 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
