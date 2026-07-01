import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticate, startSession } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = authenticate(body.email, body.password);
    startSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? "Invalid input."
        : err instanceof Error
          ? err.message
          : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
