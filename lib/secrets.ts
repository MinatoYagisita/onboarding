import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  PutSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const TTL_MS = 30 * 60 * 1000;

// ─── AWS クライアント ──────────────────────────────────────────────────────────

function makeClient(): SecretsManagerClient {
  const region = process.env.AWS_REGION ?? "ap-northeast-1";
  const endpoint = process.env.AWS_ENDPOINT;
  return new SecretsManagerClient({ region, ...(endpoint ? { endpoint } : {}) });
}

/** AWS が設定されているか（LocalStack 含む） */
function isAwsConfigured(): boolean {
  return !!(process.env.AWS_REGION && (process.env.AWS_ENDPOINT || process.env.AWS_SECRET_NAME));
}

async function fetchSecret(secretId: string): Promise<Record<string, string> | null> {
  let secretString: string | undefined;
  try {
    const res = await makeClient().send(new GetSecretValueCommand({ SecretId: secretId }));
    secretString = res.SecretString;
  } catch (err) {
    if ((err as { name?: string }).name === "ResourceNotFoundException") return null;
    throw err;
  }
  if (!secretString) return null;
  try {
    return JSON.parse(secretString) as Record<string, string>;
  } catch {
    throw new Error(`Secret "${secretId}" の値が不正な JSON です`);
  }
}

async function writeSecret(secretId: string, value: Record<string, string>): Promise<void> {
  const secretString = JSON.stringify(value);
  const client = makeClient();
  try {
    await client.send(new PutSecretValueCommand({ SecretId: secretId, SecretString: secretString }));
  } catch (err) {
    if ((err as { name?: string }).name === "ResourceNotFoundException") {
      await client.send(new CreateSecretCommand({ Name: secretId, SecretString: secretString }));
    } else {
      throw err;
    }
  }
}

// ─── グローバルシークレット（GrowDays 共通キー） ──────────────────────────────

const GLOBAL_KEYS = [
  "GROQ_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "BOX_CLIENT_ID",
  "BOX_CLIENT_SECRET",
  "ENCRYPTION_KEY",
] as const;

type GlobalKey = (typeof GLOBAL_KEYS)[number];

let globalCache: Partial<Record<GlobalKey, string>> | null = null;
let globalExpiresAt = 0;

/**
 * GrowDays 共通シークレットを取得（30分キャッシュ）。
 * AWS_SECRET_NAME が未設定の場合は .env.local の値を返す。
 */
export async function getSecrets(): Promise<Partial<Record<GlobalKey, string>>> {
  if (!process.env.AWS_SECRET_NAME || !process.env.AWS_REGION) {
    return Object.fromEntries(
      GLOBAL_KEYS.filter((k) => process.env[k]).map((k) => [k, process.env[k]])
    ) as Partial<Record<GlobalKey, string>>;
  }

  const now = Date.now();
  if (globalCache && now < globalExpiresAt) return globalCache;

  const values = await fetchSecret(process.env.AWS_SECRET_NAME);
  if (!values) throw new Error(`Secret "${process.env.AWS_SECRET_NAME}" が見つかりません`);

  globalCache = values as Partial<Record<GlobalKey, string>>;
  globalExpiresAt = now + TTL_MS;

  for (const key of GLOBAL_KEYS) {
    if (globalCache[key]) process.env[key] = globalCache[key];
  }

  return globalCache;
}

/** instrumentation.ts から呼ぶ起動時プリロード */
export async function loadSecrets(): Promise<void> {
  await getSecrets();
}

// ─── 組織ごとの AI API キー ────────────────────────────────────────────────────

export type OrgApiKey = { provider: "groq" | "claude"; apiKey: string };

/** onboarding/{orgId}/api-key */
function orgSecretId(orgId: string): string {
  return `onboarding/${orgId}/api-key`;
}

const orgCache = new Map<string, { value: OrgApiKey | null; expiresAt: number }>();

/**
 * 組織の AI API キーを取得（30分キャッシュ）。
 * - AWS 未設定（ローカル開発）→ 環境変数 GROQ_API_KEY / ANTHROPIC_API_KEY を返す
 * - AWS 設定済み → Secrets Manager から組織ごとのキーを取得
 * - Secrets Manager にキーがない → null（AI 機能が使えない状態）
 */
export async function getOrgApiKey(orgId: string): Promise<OrgApiKey | null> {
  if (!isAwsConfigured()) {
    // ローカル開発: .env.local の値を使う
    const groqKey = process.env.GROQ_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (groqKey) return { provider: "groq", apiKey: groqKey };
    if (anthropicKey) return { provider: "claude", apiKey: anthropicKey };
    return null;
  }

  const now = Date.now();
  const hit = orgCache.get(orgId);
  if (hit && now < hit.expiresAt) return hit.value;

  const values = await fetchSecret(orgSecretId(orgId));
  const value = values ? (values as unknown as OrgApiKey) : null;
  orgCache.set(orgId, { value, expiresAt: now + TTL_MS });
  return value;
}

/**
 * 組織の AI API キーを Secrets Manager に保存。
 * AWS 未設定（ローカル開発）の場合はメモリキャッシュのみに保存して再起動で消える。
 */
export async function setOrgApiKey(
  orgId: string,
  provider: "groq" | "claude",
  apiKey: string,
): Promise<void> {
  if (!isAwsConfigured()) {
    // ローカル開発: メモリキャッシュに保存（再起動で消える）
    orgCache.set(orgId, {
      value: { provider, apiKey },
      expiresAt: Date.now() + TTL_MS,
    });
    return;
  }
  await writeSecret(orgSecretId(orgId), { provider, apiKey });
  orgCache.delete(orgId);
}

/**
 * 組織の API キーが設定済みかどうかを返す（管理画面ステータス表示用）。
 * devMode: true → AWS 未設定のローカル開発環境（.env.local の値を使用中）
 */
export async function getOrgApiKeyStatus(
  orgId: string
): Promise<{ configured: boolean; provider: string | null; devMode: boolean }> {
  const devMode = !isAwsConfigured();
  const key = await getOrgApiKey(orgId);
  return { configured: key !== null, provider: key?.provider ?? null, devMode };
}
