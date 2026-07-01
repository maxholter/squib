import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { contractorSchema } from "@/lib/schemas";
import { updateContractor, getContractor } from "@/lib/data";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withUser(async (user) => {
    if (!getContractor(user.id, params.id)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    const body = await req.json();
    const data = contractorSchema.parse(body);
    // Only overwrite the encrypted tax_id when a new (non-masked) value is supplied.
    const updateTaxId =
      typeof body.tax_id === "string" &&
      body.tax_id.trim() !== "" &&
      !body.tax_id.includes("•");
    updateContractor(user.id, params.id, data, updateTaxId);
    return NextResponse.json({ ok: true });
  });
}
