#!/usr/bin/env node
/**
 * LocalStack の Secrets Manager + S3 をセットアップするスクリプト。
 * docker-compose up localstack の後に一回だけ実行する。
 *
 * 使い方:
 *   pnpm run localstack:setup
 *
 * 前提:
 *   - docker-compose up localstack が起動済み
 *   - .env.local に必要な値が設定済み
 */

import { readFileSync, existsSync } from "fs";
import {
  SecretsManagerClient,
  CreateSecretCommand,
  PutSecretValueCommand,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

// ─── .env.local の読み込み ─────────────────────────────────────────────────

const ENV_FILE = ".env.local";
if (!existsSync(ENV_FILE)) {
  console.error(`ERROR: ${ENV_FILE} が見つかりません。.env.example をコピーして作成してください。`);
  process.exit(1);
}

const envMap = new Map();
for (const line of readFileSync(ENV_FILE, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  envMap.set(key, val);
}

const get = (k) => envMap.get(k) ?? "";

// ─── クライアント設定 ────────────────────────────────────────────────────────

const ENDPOINT = "http://localhost:4566";
const REGION = "ap-northeast-1";
const CREDS = { accessKeyId: "test", secretAccessKey: "test" };

const smClient = new SecretsManagerClient({ region: REGION, endpoint: ENDPOINT, credentials: CREDS });
const s3Client = new S3Client({ region: REGION, endpoint: ENDPOINT, forcePathStyle: true, credentials: CREDS });

// ─── ヘルパー ────────────────────────────────────────────────────────────────

async function upsertSecret(name, value) {
  const secretString = JSON.stringify(value);
  try {
    await smClient.send(new GetSecretValueCommand({ SecretId: name }));
    await smClient.send(new PutSecretValueCommand({ SecretId: name, SecretString: secretString }));
    console.log(`✓ シークレット更新: ${name}`);
  } catch (e) {
    if (e.name === "ResourceNotFoundException") {
      await smClient.send(new CreateSecretCommand({ Name: name, SecretString: secretString }));
      console.log(`✓ シークレット作成: ${name}`);
    } else {
      throw e;
    }
  }
}

async function ensureBucket(bucket) {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`✓ S3 バケット既存: ${bucket}`);
  } catch {
    await s3Client.send(new CreateBucketCommand({
      Bucket: bucket,
      CreateBucketConfiguration: { LocationConstraint: REGION },
    }));
    console.log(`✓ S3 バケット作成: ${bucket}`);
  }
}

// ─── メイン ─────────────────────────────────────────────────────────────────

const GLOBAL_SECRET_NAME = "onboarding/local/api-keys";
const BUCKET = "onboarding-documents";

await upsertSecret(GLOBAL_SECRET_NAME, {
  GROQ_API_KEY: get("GROQ_API_KEY"),
  ANTHROPIC_API_KEY: get("ANTHROPIC_API_KEY"),
  GOOGLE_CLIENT_ID: get("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: get("GOOGLE_CLIENT_SECRET"),
  BOX_CLIENT_ID: get("BOX_CLIENT_ID"),
  BOX_CLIENT_SECRET: get("BOX_CLIENT_SECRET"),
  ENCRYPTION_KEY: get("ENCRYPTION_KEY"),
});

const orgId = get("DEFAULT_ORG_ID");
if (orgId) {
  const aiProvider = get("AI_PROVIDER") || "groq";
  const apiKey = aiProvider === "claude" ? get("ANTHROPIC_API_KEY") : get("GROQ_API_KEY");
  await upsertSecret(`onboarding/${orgId}/api-key`, { provider: aiProvider, apiKey });
} else {
  console.warn("⚠ DEFAULT_ORG_ID が .env.local に設定されていません。組織キーの登録をスキップします。");
  console.warn("  .env.local に DEFAULT_ORG_ID=org_sprout を追加して再実行してください。");
}

await ensureBucket(BUCKET);

console.log("");
console.log("  .env.local に以下を追加して Next.js を再起動してください:");
console.log("");
console.log("  AWS_ENDPOINT=http://localhost:4566");
console.log(`  AWS_REGION=${REGION}`);
console.log(`  AWS_SECRET_NAME=${GLOBAL_SECRET_NAME}`);
console.log(`  S3_BUCKET=${BUCKET}`);
console.log("  AWS_ACCESS_KEY_ID=test");
console.log("  AWS_SECRET_ACCESS_KEY=test");
console.log("");
console.log("  ※ GROQ_API_KEY など直接書いていた行は削除または # でコメントアウトする");
