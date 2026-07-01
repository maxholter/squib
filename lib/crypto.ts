import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Server-only cryptography helpers.
//   - Password hashing uses scrypt (built into Node, no native deps).
//   - Sensitive fields (contractor tax IDs) are encrypted at rest with AES-256-GCM.
// The encryption key is derived from SESSION_SECRET so there is nothing extra to
// configure for local use; set a stable SESSION_SECRET in production.
// ---------------------------------------------------------------------------

const SECRET =
  process.env.SESSION_SECRET ||
  "paytrack-local-dev-secret-change-in-production-0000000000000000";

const KEY = crypto.scryptSync(SECRET, "paytrack-field-encryption", 32);

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(derived, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function encryptField(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptField(payload: string): string | null {
  try {
    const [ivHex, tagHex, dataHex] = payload.split(":");
    if (!ivHex || !tagHex || !dataHex) return null;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      KEY,
      Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

// Show only the last 4 characters of a sensitive value.
export function maskTaxId(plain: string | null): string | null {
  if (!plain) return null;
  const trimmed = plain.replace(/\s+/g, "");
  if (trimmed.length <= 4) return "•••";
  return `•••••${trimmed.slice(-4)}`;
}

export function newId(): string {
  return crypto.randomUUID();
}
