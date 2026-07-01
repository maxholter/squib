import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { contractorSchema } from "@/lib/schemas";
import { createContractor } from "@/lib/data";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withUser(async (user) => {
    const data = contractorSchema.parse(await req.json());
    const contractor = createContractor(user.id, data);
    return NextResponse.json({ ok: true, contractor });
  });
}
