# プロダクト概要と現在の実装状態

## プロダクト概要

**新人・バイト向けの社内ナレッジ Q&A SaaS。**

顧客企業の研修資料・業務マニュアル・社内規程を取り込み、新入社員やアルバイトが自然な言葉で質問すると、会社の資料に基づいた回答が返ってくるシステム。

- **ターゲット**: AI・システムに疎い会社（業種不問）
- **解く痛み**: 新人教育の立ち上がり遅延（上司・先輩への問い合わせ工数の削減）
- **マルチテナント**: サブドメイン（`{orgSlug}.app.example.com`）で組織を識別。すべてのデータは `organization_id` スコープで分離

---

## 現在の実装状態（2026-05-21 時点）

### 動いているもの（実際に API + DB で機能する）

| 機能 | 場所 | 備考 |
|---|---|---|
| チャット画面（質問・追加質問・回答表示） | `components/AppShell.tsx`, `ChatView.tsx` | API 接続済み・リロード後も履歴が残る |
| チャット履歴の永続化 | `app/api/threads/` | `GET /api/threads` でマウント時フェッチ |
| スレッド削除（ユーザー） | `components/Sidebar.tsx`, `app/api/threads/[threadId]/route.ts` | 論理削除・管理データは残る |
| Claude API による回答生成 | `lib/claude.ts` | Groq（llama-3.3-70b）/ Anthropic フォールバック。3回リトライ付き |
| FAQ 一覧・カテゴリ絞り込み | `components/FaqView.tsx`, `app/api/faqs/` | API 接続済み |
| ウェルカム画面 | `components/WelcomeView.tsx` | |
| サイドバー（スレッド一覧・ピン・タブ切替・削除） | `components/Sidebar.tsx` | |
| フィードバック（役に立った／立たなかった） | `components/AnswerCard.tsx`, `app/api/threads/[threadId]/queries/[queryId]/route.ts` | API 保存済み |
| エスカレーションダイアログ（3ステップUI） | `components/EscalationDialog.tsx` | API 送信済み（`POST /api/threads/:id/queries/:id/escalations`） |
| 組織設定フォーム（色・文言・ロゴURL） | `components/admin/OrgSettingsForm.tsx` | `PATCH /api/org/settings` で DB 保存 |
| 管理画面：資料管理 | `app/admin/documents/`, `components/admin/DocumentManager.tsx` | アップロード・削除 API 接続済み |
| 管理画面：FAQ 管理 | `app/admin/faqs/`, `components/admin/FaqManager.tsx` | CRUD API 接続済み。未回答一覧から「FAQに追加」リンクあり |
| 管理画面：カテゴリ管理 | `app/admin/categories/`, `components/admin/CategoryManager.tsx` | CRUD API 接続済み |
| 管理画面：未回答一覧 | `app/admin/unanswered/`, `components/admin/UnansweredManager.tsx` | 読み取り専用。「FAQに追加」リンクのみ。削除機能なし（ユーザー会話履歴を保護） |
| 管理画面：相談一覧 | `app/admin/escalations/`, `components/admin/EscalationList.tsx` | ステータス更新（対応待ち→対応済み）API 接続済み |
| 管理画面：ユーザー管理 | `app/admin/users/`, `components/admin/UserManager.tsx` | CRUD API 接続済み。招待（パスコードメール送信）対応 |
| 管理画面：通知設定 | `components/admin/NotificationSettings.tsx` | `GET/PATCH /api/admin/notifications` 接続済み |
| 管理画面：APIキー設定 | `components/admin/ApiKeySettings.tsx` | 組織ごとに Secrets Manager へ保存 |
| パスコード認証（ユーザー・管理者） | `app/api/auth/passcode/`, `components/LoginForm.tsx`, `components/AdminLoginForm.tsx` | 2ステップUI（メール→コード入力）。ロックアウト・レート制限対応 |
| パスキー認証（WebAuthn / 生体認証） | `app/api/auth/webauthn/`, `components/PasskeyLoginButton.tsx` | 登録・認証フロー実装済み。ログインフォームに「パスキーでログイン」ボタン表示 |
| アカウント設定（パスキー管理） | `app/settings/`, `components/PasskeyManager.tsx` | パスキー一覧・追加・削除。サイドバーから遷移可能 |
| セッション署名（HMAC-SHA256） | `lib/tokenSigning.ts`, `lib/session.ts` | Cookie に署名付きトークン。Edge Runtime / Node.js 両対応 |
| 未認証リダイレクト + HMAC検証 | `proxy.ts` | 署名検証済み。公開 API（パスコード・WebAuthn 認証系）はスルー |
| Slack 通知（Block Kit形式） | `lib/notify.ts` | エスカレーション・未回答の2種類。Webhook URL を管理画面から設定 |
| メール通知 | `lib/notify.ts` | Resend API 使用。管理画面で email チャネルを登録すれば有効。開発時はコンソールに出力 |
| エラーハンドリング（集中管理） | `lib/errors.ts`, `lib/logger.ts`, `lib/api.ts` | 構造化ログ・PII サニタイズ・AppError 例外階層 |
| クライアント fetch ラッパー | `lib/fetch.ts` | 401 受信時に `/login` または `/admin/login` に自動リダイレクト |
| Google Drive / Box 連携 | `lib/drive-*.ts`, `app/api/org/integrations/` | OAuthフロー・同期ロジック実装済み。管理画面から接続・フォルダ指定・手動同期可能 |
| ローカル開発用モックログイン | `app/api/auth/mock-login/route.ts` | `admin`/`Zaq12wsx` で DB セッションを作成。本番では 404 を返す |

### モック・未実装のもの

| 機能 | 現状 | 本番で必要なもの |
|---|---|---|
| 資料の実ファイル保管 | テキスト抽出後 DB の `storageKey` フィールドにパス保存（S3 未接続） | S3 互換ストレージへのアップロード |
| マルチテナント（サブドメイン） | `DEFAULT_ORG_SLUG` 環境変数で代替 | `proxy.ts` でのサブドメイン解析（実装済み。DNS設定のみ未） |
| ランキング・ダッシュボード | 管理UIのみ（ハードコードデータ） | `GET /api/admin/ranking` API 接続 |
| パスコード認証のメール送信 | 開発時はコンソール出力。本番は Resend API | `RESEND_API_KEY` と送信元ドメインの設定 |

---

## 環境変数

| 変数名 | 説明 | 置き場所 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API キー。**サーバー側のみ**（`NEXT_PUBLIC_` を付けてはいけない） | ローカル: `.env.local` / 本番: AWS Secrets Manager |
| `GROQ_API_KEY` | Groq API キー（メインプロバイダ）。**サーバー側のみ** | ローカル: `.env.local` / 本番: AWS Secrets Manager |
| `DATABASE_URL` | PostgreSQL 接続文字列 | ローカル: `.env.local` / 本番: AWS Secrets Manager |
| `SESSION_SECRET` | セッショントークンの HMAC-SHA256 署名キー | ローカル: `.env.local` / 本番: AWS Secrets Manager |
| `DEFAULT_ORG_SLUG` | ローカル開発時のデフォルト組織スラッグ（マルチテナントの代替） | `.env.local` のみ |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Drive OAuth 用 | `.env.local` / 本番: AWS Secrets Manager |
| `BOX_CLIENT_ID` / `BOX_CLIENT_SECRET` | Box OAuth 用 | `.env.local` / 本番: AWS Secrets Manager |
| `ENCRYPTION_KEY` | OAuth リフレッシュトークンの AES-256-GCM 暗号化キー（32バイト hex）| AWS Secrets Manager |
| `APP_BASE_URL` | OAuth コールバック URL のベース（例: `https://app.example.com`）。WebAuthn の RP ID にも使用 | 本番のみ |
| `RESEND_API_KEY` | パスコード・通知メール送信用 Resend API キー | ローカル: `.env.local`（任意）/ 本番: AWS Secrets Manager |
| `RESEND_FROM` | 送信元メールアドレス（例: `noreply@yourdomain.com`） | ローカル: `.env.local` / 本番: AWS Secrets Manager |

- `.env.example` にテンプレートあり。コピーして実際の値を入れる
- **`.env.local` は絶対に Git にコミットしない・Claude に読み込ませない**
- AI API キーは GrowDays が1つ持ち全組織で共用（各組織が個別キーを持つ設計は不要）
- `GROQ_API_KEY` が設定されていれば Groq を使用、なければ `ANTHROPIC_API_KEY` にフォールバック

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フレームワーク | Next.js 16 / React 19（breaking changes あり → `AGENTS.md` 参照） |
| スタイル | Tailwind CSS v4 |
| 認証 | パスコード（メール送付）+ パスキー（WebAuthn）。セッションは DB 管理・HMAC 署名 |
| DB | PostgreSQL + Prisma 7（`@prisma/adapter-pg` 使用） |
| AI | Groq SDK（メイン）/ Anthropic SDK（フォールバック）。tool_use で JSON スキーマ強制 |
| ストレージ | S3 互換（未接続）。本番は Amazon S3 + KMS 暗号化 |
| メール | Resend API。開発時はコンソール出力 |
| パスキー | `@simplewebauthn/server` + `@simplewebauthn/browser` |
| エラー設計 | `lib/errors.ts`（AppError 階層）、`lib/logger.ts`（構造化ログ・PII サニタイズ）|

## 用語の統一方針

コードでは `ChatTurn` / `turns`、DB・APIでは `query` / `queries` と混在している。
**今後は `query` に統一する**（DB・API 仕様書の定義に合わせる）。実装時にコードの型名・変数名を `Query` / `queries` に変更すること。

## proxy.ts の動作

- Cookie の HMAC-SHA256 署名を検証してセッションの正当性を確認する
- 公開 API（`/api/auth/passcode/*`, `/api/auth/webauthn/authenticate/*`, `/api/auth/logout`, `/api/auth/mock-login`）はスルー
- 未認証アクセスは `/login`（管理画面は `/admin/login`）にリダイレクト
- クライアント側 `lib/fetch.ts` が API の 401 レスポンスを受けた場合もリダイレクト

## ローカル開発でのマルチテナント

本番はサブドメインで組織を識別するが、`localhost` ではサブドメインが使えない。開発時は以下の方法で組織を指定する：

- `proxy.ts` でリクエストヘッダー `X-Organization-Slug` を読み取り、なければ環境変数 `DEFAULT_ORG_SLUG` にフォールバック
- `.env.local` に `DEFAULT_ORG_SLUG=sprout` を設定して開発する

## ローカル開発のログイン方法

パスコード認証（本番と同じフロー）:
1. `/login` でメールアドレスを入力 → 「パスコードを送信」
2. dev server のターミナルログ（または `.next/dev/logs/next-development.log`）に `[DEV] passcode for xxx: 123456` と表示
3. 6桁コードを入力してログイン

モックログイン（開発専用 API、DB セッション作成）:
- ID: `admin` / PW: `Zaq12wsx`
- `/api/auth/mock-login` に POST。本番環境では 404 を返す

シードユーザー:
- ユーザー: `member@sprout.example.com`
- 管理者: `admin@sprout.example.com`

## 実装優先度

| 優先度 | タスク | 状態 |
|---|---|---|
| 1 | AI API 接続（Groq / Anthropic） | **完了** |
| 2 | チャット履歴の永続化 | **完了** |
| 3 | 組織設定の DB 保存 | **完了** |
| 4 | フィードバック・エスカレーションの保存 | **完了** |
| 5 | パスコード認証（メール送付） | **完了** |
| 6 | パスキー認証（WebAuthn / 生体認証） | **完了** |
| 7 | Slack / メール通知 | **完了** |
| 8 | ユーザー管理（管理画面） | **完了** |
| 9 | ファイルストレージ（S3）接続 | 未着手 |
| 10 | マルチテナント（DNS・サブドメイン設定） | 未着手 |
| 11 | ランキング API 接続 | 未着手 |
