import { NextResponse } from "next/server";
import { withUser } from "@/lib/api";
import { profileSchema, taxRateSchema } from "@/lib/schemas";
import { updateProfile, updateFedTaxRate } from "@/lib/data";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  return withUser(async (user) => {
    const body = await req.json();
    if (body.section === "tax_rate") {
      const { fed_tax_rate } = taxRateSchema.parse(body);
      updateFedTaxRate(user.id, fed_tax_rate);
      return NextResponse.json({ ok: true });
    }
    const data = profileSchema.parse(body);
    updateProfile(user.id, data);
    return NextResponse.json({ ok: true });
  });
}
