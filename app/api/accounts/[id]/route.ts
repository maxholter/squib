import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { accountSchema } from "@/lib/schemas";
import { updateAccount, deleteAccount, accountTransactionCount } from "@/lib/data";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withUser(async (user) => {
    const data = accountSchema.parse(await req.json());
    updateAccount(user.id, params.id, data);
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return withUser(async (user) => {
    if (accountTransactionCount(user.id, params.id) > 0) {
      return NextResponse.json(
        { error: "This account has transactions linked to it and can't be deleted." },
        { status: 400 },
      );
    }
    deleteAccount(user.id, params.id);
    return NextResponse.json({ ok: true });
  });
}
