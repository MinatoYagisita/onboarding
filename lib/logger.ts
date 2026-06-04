type LogLevel = "INFO" | "WARN" | "ERROR";

type LogEntry = {
  requestId: string;
  path: string;
  method: string;
  userId?: string;
  sessionHint?: string;
  durationMs?: number;
  code?: string;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
};

// ログに出力してはいけないフィールド名（部分一致）
const SENSITIVE_KEYS = [
  "password", "passcode", "token", "secret",
  "credit", "card", "cvv", "pin", "apiKey", "api_key",
  "refreshToken", "accessToken", "encryptedRefreshToken",
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s.toLowerCase()));
}

function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at < 0) return value;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  return `${local.slice(0, 2)}***@${domain}`;
}

/** ログ出力前に context から PII を除去する */
export function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => {
      if (isSensitiveKey(k)) return [k, "***"];
      if (typeof v === "string" && v.includes("@") && v.includes(".")) {
        return [k, maskEmail(v)];
      }
      return [k, v];
    })
  );
}

function emit(level: LogLevel, entry: LogEntry) {
  const record = {
    level,
    timestamp: new Date().toISOString(),
    ...entry,
    context: entry.context ? sanitize(entry.context) : undefined,
  };
  // undefined フィールドを除去してコンパクトに出力
  const cleaned = Object.fromEntries(
    Object.entries(record).filter(([, v]) => v !== undefined)
  );
  const line = JSON.stringify(cleaned);
  if (level === "ERROR") {
    console.error(line);
  } else if (level === "WARN") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (entry: LogEntry) => emit("INFO", entry),
  warn: (entry: LogEntry) => emit("WARN", entry),
  error: (entry: LogEntry) => emit("ERROR", entry),
};
