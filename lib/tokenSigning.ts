// Edge Runtime と Node.js 両方で動作する WebCrypto ベースの HMAC 署名
// proxy.ts (Edge) と session.ts (Node) が共有する

function getSecret(): string {
  return process.env.SESSION_SECRET ?? "dev_secret_change_in_production";
}

async function importKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

function bufToBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlToBuf(b64: string): Uint8Array | null {
  try {
    const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
    const str = atob(padded);
    const buf = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
    return buf;
  } catch {
    return null;
  }
}

/** raw トークンに HMAC 署名を付与して "{raw}.{sig}" 形式で返す */
export async function signToken(raw: string): Promise<string> {
  const key = await importKey("sign");
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  return `${raw}.${bufToBase64url(sig)}`;
}

/**
 * 署名付きトークンを検証し、raw トークンを返す。
 * 署名が不正な場合は null を返す。
 */
export async function verifyToken(signed: string): Promise<string | null> {
  const dotIdx = signed.lastIndexOf(".");
  if (dotIdx < 0) return null;
  const raw = signed.slice(0, dotIdx);
  const sigBuf = base64urlToBuf(signed.slice(dotIdx + 1));
  if (!sigBuf) return null;
  const key = await importKey("verify");
  // TypeScript の Uint8Array<ArrayBufferLike> → BufferSource のキャスト
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBuf.buffer.slice(sigBuf.byteOffset, sigBuf.byteOffset + sigBuf.byteLength) as ArrayBuffer,
    new TextEncoder().encode(raw),
  );
  return valid ? raw : null;
}
