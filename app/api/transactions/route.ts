import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { transactionSchema } from "@/lib/schemas";
import { createTransaction } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withUser(async (user) => {
    const data = transactionSchema.parse(await req.json());
    const tx = createTransaction(user.id, data);
    return NextResponse.json({ ok: true, transaction: tx });
  });
}
