import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { taxPaymentSchema } from "@/lib/schemas";
import { createTaxPayment } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withUser(async (user) => {
    const data = taxPaymentSchema.parse(await req.json());
    createTaxPayment(user.id, { ...data, quarter: data.quarter as 1 | 2 | 3 | 4 });
    return NextResponse.json({ ok: true });
  });
}
