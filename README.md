# オンボーディング Q&A システム

新入社員・アルバイト向けの社内ナレッジ Q&A SaaS。  
社内規約・マニュアルをアップロードすると、AI が自然言語で回答します。

---

## 必要なもの

| ツール         | バージョン |
| -------------- | ---------- |
| Node.js        | 22 以上    |
| pnpm           | 9 以上     |
| Docker Desktop | 最新安定版 |

---

## ローカル起動手順

### 1. リポジトリを clone して依存パッケージをインストール

```bash
git clone <このリポジトリの URL>
cd onboarding
pnpm install
```

### 2. 環境変数ファイルを作成

```bash
cp .env.example .env.local
```

`.env.local` を開いて、少なくとも以下を設定してください：

| 変数名         | 説明                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| `GROQ_API_KEY` | [Groq コンソール](https://console.groq.com/keys) で取得（無料・カード不要） |
| `DATABASE_URL` | そのまま（Docker で PostgreSQL を起動するので変更不要）                     |

> AI_PROVIDER が `groq`（デフォルト）の場合は `GROQ_API_KEY` のみ必要です。

### 3. Docker で DB を起動

```bash
docker-compose up -d db
```

### 4. DB のマイグレーションとシードデータ投入

```bash
pnpm run db:migrate
pnpm run db:seed
```

### 5. 開発サーバーを起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くとログイン画面が表示されます。

**モック認証情報（開発用）**

| 画面                | ID    | パスワード |
| ------------------- | ----- | ---------- |
| ユーザーフロント    | admin | Zaq12wsx   |
| 管理画面 (`/admin`) | admin | Zaq12wsx   |

---

## LocalStack を使った AWS 連携のテスト（任意）

本番環境では AWS Secrets Manager と S3 を使用します。  
LocalStack を使うとローカルでも同じコードパスを検証できます。

### 1. LocalStack を起動

```bash
cd onboarding
docker-compose up -d localstack
```

### 2. `.env.local` に組織 ID・AI プロバイダを追記

組織 ID を確認します（PowerShell / bash 共通）：

```bash
docker exec onboarding-db-1 psql -U onboarding -d onboarding -c "SELECT id, slug FROM organizations;"
```

`.env.local` に追記：

```
DEFAULT_ORG_ID=org_sprout    # 上で確認した id の値

# Claude を使う場合
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...

# Groq を使う場合
# AI_PROVIDER=groq
# GROQ_API_KEY=gsk_...
```

### 3. LocalStack にシークレット・バケットを作成

```bash
pnpm run localstack:setup
```

スクリプトが以下を自動作成します：

- Secrets Manager: `onboarding/local/api-keys`（グローバル共通キー）
- Secrets Manager: `onboarding/{組織ID}/api-key`（per-org キー）
- S3 バケット: `onboarding-documents`

### 4. `.env.local` に LocalStack 用の変数を追記

```
AWS_ENDPOINT=http://localhost:4566
AWS_REGION=ap-northeast-1
AWS_SECRET_NAME=onboarding/local/api-keys
S3_BUCKET=onboarding-documents
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

> `AWS_ENDPOINT` を設定すると自動的に Secrets Manager 経由に切り替わります。  
> `GROQ_API_KEY` / `ANTHROPIC_API_KEY` の直書き行はそのままでも動作しますが、  
> 混乱防止のため `#` でコメントアウトすることを推奨します。

### 5. 開発サーバーを再起動

```bash
pnpm dev
```

管理画面の「設定 → AI API キー」で **設定済み（Anthropic Claude）** と表示されれば成功です。

### Secrets Manager のキーを手動で更新したい場合

LocalStack が起動中であれば AWS CLI で直接更新できます：

```bash
aws --endpoint-url=http://localhost:4566 --region ap-northeast-1 \
  --no-cli-pager \
  secretsmanager put-secret-value \
  --secret-id "onboarding/org_sprout/api-key" \
  --secret-string "{\"provider\":\"claude\",\"apiKey\":\"sk-ant-...\"}"
```

更新後はサーバーキャッシュ（30分 TTL）をクリアするためサーバーを再起動してください。

---

## よく使うコマンド

```bash
pnpm dev                  # 開発サーバー起動
pnpm build                # 本番ビルド
pnpm run db:migrate       # マイグレーション実行
pnpm run db:seed          # シードデータ投入
pnpm run db:studio        # Prisma Studio（DB GUIツール）を開く
pnpm run db:reset         # DB を初期状態にリセット
pnpm run localstack:setup # LocalStack にシークレット・S3 バケットを作成
```

---

## ディレクトリ構成

```
app/
  admin/        管理画面（設定・FAQ・資料・未回答など）
  api/          API ルート（Next.js Route Handlers）
  login/        ユーザーフロントのログイン画面
components/
  admin/        管理画面専用コンポーネント
  AppShell.tsx  ユーザーフロントのメインレイアウト
lib/
  claude.ts     AI 回答生成（Groq / Anthropic SDK）
  db.ts         Prisma クライアント
  secrets.ts    AWS Secrets Manager（グローバル + per-org キー管理）
  storage.ts    S3 ファイルアップロード
  errors.ts     AppError 例外階層・エラーコード定義
  logger.ts     構造化ログ（PII サニタイズ付き）
prisma/
  schema.prisma データベーススキーマ
  seed.ts       シードデータ
scripts/
  localstack-init.mjs  LocalStack セットアップスクリプト
```

---

## 技術スタック

| レイヤー         | 技術                                                   |
| ---------------- | ------------------------------------------------------ |
| フレームワーク   | Next.js 16 / React 19                                  |
| スタイル         | Tailwind CSS v4                                        |
| DB               | PostgreSQL + Prisma 7                                  |
| AI               | Groq SDK（メイン）/ Anthropic SDK（フォールバック）    |
| ストレージ       | AWS S3 互換（LocalStack でローカルテスト可能）         |
| シークレット管理 | AWS Secrets Manager（LocalStack でローカルテスト可能） |

---

## 注意事項

- `.env.local` は Git にコミットしないでください（`.gitignore` で除外済み）
- `NODE_TLS_REJECT_UNAUTHORIZED=0` は開発用です。本番では使用しないでください
- 認証は現在モック実装です。外部公開前に Auth.js への差し替えが必要です
