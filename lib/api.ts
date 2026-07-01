import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserApi, type SessionUser } from "./auth";

// Wrap an authenticated JSON handler with consistent auth + error handling.
export async function withUser(
  handler: (user: SessionUser) => Promise<NextResponse> | NextResponse,
): Promise<NextResponse> {
  const user = requireUserApi();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  try {
    return await handler(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.errors[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Coerce empty strings from forms to null.
export const emptyToNull = (v: unknown) =>
  v === "" || v === undefined ? null : v;
