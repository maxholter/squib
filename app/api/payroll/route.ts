import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { payrollSchema } from "@/lib/schemas";
import { createPayrollRun } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withUser(async (user) => {
    const data = payrollSchema.parse(await req.json());
    createPayrollRun(user.id, data);
    return NextResponse.json({ ok: true });
  });
}
