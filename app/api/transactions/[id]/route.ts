import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { transactionSchema } from "@/lib/schemas";
import { updateTransaction, deleteTransaction, getTransaction } from "@/lib/data";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withUser(async (user) => {
    if (!getTransaction(user.id, params.id)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const data = transactionSchema.parse(await req.json());
    updateTransaction(user.id, params.id, data);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return withUser(async (user) => {
    deleteTransaction(user.id, params.id);
    return NextResponse.json({ ok: true });
  });
}
