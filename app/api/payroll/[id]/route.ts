import { NextResponse } from "next/server";
import { z } from "zod";
import { withUser } from "@/lib/api";
import { payrollSchema } from "@/lib/schemas";
import {
  updatePayrollRun,
  deletePayrollRun,
  markPayrollPaid,
  getPayrollRun,
} from "@/lib/data";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withUser(async (user) => {
    if (!getPayrollRun(user.id, params.id)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const body = await req.json();
    // Quick "mark as paid" action.
    if (body.action === "mark_paid") {
      const { paid_at } = z
        .object({ paid_at: z.string().min(1) })
        .parse(body);
      markPayrollPaid(user.id, params.id, paid_at);
      return NextResponse.json({ ok: true });
    }
    const data = payrollSchema.parse(body);
    updatePayrollRun(user.id, params.id, data);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return withUser(async (user) => {
    deletePayrollRun(user.id, params.id);
    return NextResponse.json({ ok: true });
  });
}
