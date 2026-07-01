import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { deleteTaxPayment } from "@/lib/data";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return withUser(async (user) => {
    deleteTaxPayment(user.id, params.id);
    return NextResponse.json({ ok: true });
  });
}
