import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { accountSchema } from "@/lib/schemas";
import { createAccount } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withUser(async (user) => {
    const data = accountSchema.parse(await req.json());
    const account = createAccount(user.id, data);
    return NextResponse.json({ ok: true, account });
  });
}
