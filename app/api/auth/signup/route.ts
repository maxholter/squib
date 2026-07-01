import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, startSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters."),
  full_name: z.string().optional(),
  business_name: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = createUser(body.email, body.password, {
      full_name: body.full_name,
      business_name: body.business_name,
    });
    startSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? err.errors[0]?.message ?? "Invalid input."
        : err instanceof Error
          ? err.message
          : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
