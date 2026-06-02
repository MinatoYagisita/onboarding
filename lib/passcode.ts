import { randomInt, randomBytes, scrypt, timingSafeEqual } from "crypto";

const PASSCODE_TTL_MS = 10 * 60 * 1000;
export const PASSCODE_TTL_SEC = PASSCODE_TTL_MS / 1000;

export function generateCode(): string {
  return String(randomInt(100000, 1000000));
}

function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashCode(code: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(code, salt, 32);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyCode(code: string, stored: string): Promise<boolean> {
  const [salt, expectedHex] = stored.split(":");
  if (!salt || !expectedHex) return false;
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = await scryptAsync(code, salt, 32);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function passcodeExpiresAt(): Date {
  return new Date(Date.now() + PASSCODE_TTL_MS);
}
