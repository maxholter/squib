import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { hashPassword, verifyPassword, newId } from "./crypto";
import type { UserProfile } from "./types";

const SESSION_COOKIE = "paytrack_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
}

function isoInDays(days: number): string {
  return new Date(Date.now() + days * 86400_000).toISOString();
}

export function createUser(email: string, password: string, profile: {
  full_name?: string;
  business_name?: string;
}): SessionUser {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email.toLowerCase());
  if (existing) {
    throw new Error("An account with that email already exists.");
  }
  const id = newId();
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").run(
      id,
      email.toLowerCase(),
      hashPassword(password),
    );
    db.prepare(
      "INSERT INTO users_profile (id, full_name, business_name) VALUES (?, ?, ?)",
    ).run(id, profile.full_name ?? null, profile.business_name ?? null);
  });
  tx();
  return { id, email: email.toLowerCase() };
}

export function authenticate(email: string, password: string): SessionUser {
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(email.toLowerCase()) as
    | { id: string; email: string; password_hash: string }
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new Error("Invalid email or password.");
  }
  return { id: row.id, email: row.email };
}

export function startSession(userId: string): void {
  const db = getDb();
  const token = newId() + newId().replace(/-/g, "");
  db.prepare(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
  ).run(token, userId, isoInDays(SESSION_DAYS));
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export function endSession(): void {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  cookies().delete(SESSION_COOKIE);
}

export function getCurrentUser(): SessionUser | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id AS id, u.email AS email, s.expires_at AS expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`,
    )
    .get(token) as { id: string; email: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return { id: row.id, email: row.email };
}

// For use in server components / route handlers: redirect to sign-in if absent.
export function requireUser(): SessionUser {
  const user = getCurrentUser();
  if (!user) redirect("/auth/signin");
  return user;
}

// For API routes: return null instead of redirecting.
export function requireUserApi(): SessionUser | null {
  return getCurrentUser();
}

export function getProfile(userId: string): UserProfile {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users_profile WHERE id = ?")
    .get(userId) as UserProfile | undefined;
  if (row) return row;
  // Self-heal a missing profile row.
  db.prepare("INSERT INTO users_profile (id) VALUES (?)").run(userId);
  return db.prepare("SELECT * FROM users_profile WHERE id = ?").get(userId) as UserProfile;
}
