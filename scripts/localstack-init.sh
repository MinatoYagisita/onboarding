#!/bin/bash
# LocalStack の Secrets Manager にシークレットを作成・更新するセットアップスクリプト。
# docker-compose up localstack の後に一回だけ実行する。
#
# 使い方:
#   pnpm run localstack:setup
#
# 前提:
#   - docker-compose up localstack が起動済み
#   - aws CLI がインストール済み（pip install awscli）

set -e

ENDPOINT="http://localhost:4566"
REGION="ap-northeast-1"
SECRET_NAME="onboarding/local/api-keys"
ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE が見つかりません。.env.example をコピーして作成してください。"
  exit 1
fi

load_env() {
  grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

SECRET_VALUE=$(cat <<EOF
{
  "GROQ_API_KEY":        "$(load_env GROQ_API_KEY)",
  "ANTHROPIC_API_KEY":   "$(load_env ANTHROPIC_API_KEY)",
  "GOOGLE_CLIENT_ID":    "$(load_env GOOGLE_CLIENT_ID)",
  "GOOGLE_CLIENT_SECRET":"$(load_env GOOGLE_CLIENT_SECRET)",
  "BOX_CLIENT_ID":       "$(load_env BOX_CLIENT_ID)",
  "BOX_CLIENT_SECRET":   "$(load_env BOX_CLIENT_SECRET)",
  "ENCRYPTION_KEY":      "$(load_env ENCRYPTION_KEY)"
}
EOF
)

aws --endpoint-url "$ENDPOINT" --region "$REGION" \
  secretsmanager describe-secret --secret-id "$SECRET_NAME" > /dev/null 2>&1 \
  && aws --endpoint-url "$ENDPOINT" --region "$REGION" \
       secretsmanager put-secret-value \
       --secret-id "$SECRET_NAME" \
       --secret-string "$SECRET_VALUE" \
  || aws --endpoint-url "$ENDPOINT" --region "$REGION" \
       secretsmanager create-secret \
       --name "$SECRET_NAME" \
       --secret-string "$SECRET_VALUE"

echo "✓ グローバルシークレット '$SECRET_NAME' を LocalStack に登録しました。"

# ─── 組織ごとの API キー ─────────────────────────────────────────────────────
# DEFAULT_ORG_ID が .env.local に設定されている場合に per-org キーを作成する
ORG_ID=$(load_env DEFAULT_ORG_ID)
if [ -n "$ORG_ID" ]; then
  ORG_SECRET_NAME="onboarding/${ORG_ID}/api-key"
  # プロバイダは AI_PROVIDER で決定（未設定なら groq）
  AI_PROVIDER_VALUE=$(load_env AI_PROVIDER)
  AI_PROVIDER_VALUE="${AI_PROVIDER_VALUE:-groq}"

  if [ "$AI_PROVIDER_VALUE" = "claude" ]; then
    ORG_API_KEY=$(load_env ANTHROPIC_API_KEY)
  else
    ORG_API_KEY=$(load_env GROQ_API_KEY)
  fi

  ORG_SECRET_VALUE="{\"provider\":\"${AI_PROVIDER_VALUE}\",\"apiKey\":\"${ORG_API_KEY}\"}"

  aws --endpoint-url "$ENDPOINT" --region "$REGION" \
    secretsmanager describe-secret --secret-id "$ORG_SECRET_NAME" > /dev/null 2>&1 \
    && aws --endpoint-url "$ENDPOINT" --region "$REGION" \
         secretsmanager put-secret-value \
         --secret-id "$ORG_SECRET_NAME" \
         --secret-string "$ORG_SECRET_VALUE" \
    || aws --endpoint-url "$ENDPOINT" --region "$REGION" \
         secretsmanager create-secret \
         --name "$ORG_SECRET_NAME" \
         --secret-string "$ORG_SECRET_VALUE"

  echo "✓ 組織キー '$ORG_SECRET_NAME' を LocalStack に登録しました。"
else
  echo "⚠ DEFAULT_ORG_ID が .env.local に設定されていません。組織キーの登録をスキップします。"
  echo "  .env.local に DEFAULT_ORG_ID=org_sprout を追加して再実行してください。"
fi

# S3 バケット作成
BUCKET="onboarding-documents"
aws --endpoint-url "$ENDPOINT" --region "$REGION" \
  s3api head-bucket --bucket "$BUCKET" > /dev/null 2>&1 \
  || aws --endpoint-url "$ENDPOINT" --region "$REGION" \
       s3api create-bucket --bucket "$BUCKET" \
       --create-bucket-configuration LocationConstraint="$REGION"

echo "✓ S3 バケット '$BUCKET' を LocalStack に作成しました。"
echo ""
echo "  .env.local に以下を追加して Next.js を再起動してください:"
echo ""
echo "  AWS_ENDPOINT=http://localhost:4566"
echo "  AWS_REGION=$REGION"
echo "  AWS_SECRET_NAME=$SECRET_NAME"
echo "  S3_BUCKET=$BUCKET"
echo ""
echo "  ※ GROQ_API_KEY など直接書いていた行は削除または # でコメントアウトする"
