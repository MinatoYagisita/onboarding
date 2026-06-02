# API 仕様書 - オンボーディングシステム

## 概要

- ベース URL: `https://api.<domain>/v1`
- 認証: Auth.js のセッション Cookie（httpOnly, Secure, SameSite=Lax）
- リクエスト／レスポンスはすべて JSON（`Content-Type: application/json`）
- 日時は ISO 8601（UTC）
- ID は文字列（ULID または CUID を想定）
- マルチテナント: 組織はユーザーフロントのサブドメイン（`{orgSlug}.app.example.com`）で特定する。すべての API は認証セッションに紐づく `organizationId` スコープで動作する
- 未認証状態でのアクセス: ユーザーフロントの全ページは `/login` にリダイレクトする

## 認可ロール

| ロール | 説明 |
|------|------|
| `member` | 一般ユーザー（社員・バイトなど）。自分の質問履歴のみアクセス可 |
| `admin` | 組織管理者。組織設定・資料・FAQ・カテゴリ・未回答一覧を管理できる |

## 共通エラーレスポンス

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": {
      "errors": [
        { "field": "question", "message": "空文字列にできません" },
        { "field": "categoryId", "message": "存在しないカテゴリIDです" }
      ]
    }
  }
}
```

`details.errors` は配列形式で複数フィールドのエラーを同時に返す。単一フィールドのエラーでも必ず配列で返す。

| HTTP | code | 説明 |
|------|------|------|
| 400 | `VALIDATION_ERROR` | 入力値が不正（details.errors に詳細） |
| 400 | `PASSCODE_EXPIRED` | パスコードの有効期限切れ |
| 400 | `FILE_TOO_LARGE` | アップロードファイルが上限（2MB）超過 |
| 400 | `UNSUPPORTED_FILE_TYPE` | 非対応のファイル形式 |
| 401 | `UNAUTHENTICATED` | 未認証またはセッション期限切れ |
| 403 | `FORBIDDEN` | 認証済みだが権限不足 |
| 404 | `NOT_FOUND` | リソース未存在（論理削除済みも含む） |
| 409 | `CONFLICT` | 重複・競合 |
| 409 | `PASSCODE_ALREADY_USED` | パスコード検証済み（再利用不可） |
| 429 | `RATE_LIMITED` | レート制限超過 |
| 500 | `INTERNAL_ERROR` | サーバー内部エラー（詳細はログのみ、レスポンスには含めない） |
| 503 | `AI_UNAVAILABLE` | Claude API 障害・タイムアウト |

### 401 と 403 の使い分け

| 状況 | コード | 理由 |
|------|--------|------|
| Cookie なし / セッション期限切れ | 401 | 認証自体ができていない |
| member が `/admin/*` にアクセス | 403 | 認証済みだが admin ロールがない |
| 他ユーザーのスレッドにアクセス | 403 | 認証済みだが所有権がない |
| ログアウト後の操作 | 401 | セッションが消えている |

### 401 受信時のクライアント挙動

API から `401 UNAUTHENTICATED` を受け取ったとき、クライアントは即座に `/login`（管理画面は `/admin/login`）にリダイレクトする。グローバルな fetch ラッパーまたは axios インターセプターで一元処理する。

### 500 の扱い

本番環境では `INTERNAL_ERROR` のレスポンスにスタックトレース・DB エラーメッセージ・内部パス等を含めない。詳細はサーバーログ（CloudWatch 等）にのみ出力する。

### 論理削除済みリソース

`deleted_at` が設定されたリソースへの GET は `404 NOT_FOUND` を返す。`410 Gone` は使用しない（統一のため）。

## エンドポイント一覧

| カテゴリ | メソッド | パス | 権限 | 概要 |
|---------|---------|------|-----|------|
| 認証 | POST | `/auth/passcode/request` | public | メールアドレスにパスコード送付 |
| 認証 | POST | `/auth/passcode/verify` | public | パスコードを検証してセッション発行 |
| 認証 | POST | `/auth/logout` | member | ログアウト |
| 認証 | GET  | `/auth/me` | member | 自分の認証情報を取得 |
| 組織設定 | GET  | `/org/settings` | member | ユーザーフロント表示用の組織設定を取得 |
| 組織設定 | PATCH| `/org/settings` | admin  | 組織設定を更新（色・ロゴ・文言） |
| 組織設定 | POST | `/org/logo` | admin  | ロゴ画像をアップロード |
| 質問回答 | POST | `/threads` | member | 新しい会話スレッドを開始する（最初の質問を送信） |
| 質問回答 | GET  | `/threads` | member | 自分のスレッド履歴一覧 |
| 質問回答 | GET  | `/threads/:threadId` | member | スレッドと全 turn を取得 |
| 質問回答 | PATCH| `/threads/:threadId` | member | ピン / メモを更新 |
| 質問回答 | DELETE | `/threads/:threadId` | member | スレッドを削除 |
| 質問回答 | POST | `/threads/:threadId/queries` | member | 追加の質問（turn）を送信する |
| 質問回答 | PATCH| `/threads/:threadId/queries/:queryId` | member | 各 turn のフィードバックを更新 |
| エスカレーション | POST | `/threads/:threadId/queries/:queryId/escalations` | member | 特定 turn を担当者へ送信 |
| FAQ | GET  | `/faqs` | member | FAQ 一覧（カテゴリフィルタ・ソート対応） |
| FAQ | GET  | `/faqs/:id` | member | FAQ 詳細 |
| FAQ | POST | `/faqs` | admin  | FAQ を追加 |
| FAQ | PATCH| `/faqs/:id` | admin  | FAQ を更新 |
| FAQ | DELETE | `/faqs/:id` | admin  | FAQ を削除 |
| カテゴリ | GET  | `/categories` | member | カテゴリ一覧 |
| カテゴリ | POST | `/categories` | admin  | カテゴリを追加 |
| カテゴリ | PATCH| `/categories/:id` | admin  | カテゴリを更新 |
| カテゴリ | DELETE | `/categories/:id` | admin  | カテゴリを削除 |
| 資料 | GET  | `/documents` | admin | 資料一覧 |
| 資料 | POST | `/documents` | admin | 資料をアップロード |
| 資料 | DELETE | `/documents/:id` | admin | 資料を削除 |
| 管理 | GET  | `/admin/unanswered` | admin | 未回答の質問一覧 |
| 管理 | GET  | `/admin/ranking` | admin | 質問ランキング |
| 管理 | GET  | `/admin/notifications` | admin | 通知設定の取得 |
| 管理 | PATCH| `/admin/notifications` | admin | 通知設定の更新（Slack Webhook 等） |
| ユーザー管理 | GET  | `/admin/users` | admin | 組織のユーザー一覧 |
| ユーザー管理 | POST | `/admin/users` | admin | ユーザーを追加（パスコードをメール送付） |
| ユーザー管理 | PATCH| `/admin/users/:id` | admin | ユーザー情報・ロールを更新 |
| ユーザー管理 | DELETE | `/admin/users/:id` | admin | ユーザーを削除（論理削除） |

---

## 認証

### 認証フロー概要

- ユーザーフロント: メールアドレス + パスコード（メール送付）を標準とする
- 試行制限: 同一メールアドレスに対し、ログイン試行は60分で5回失敗で一時ロックアウト（15分）
- エラー文言: 失敗時は「IDまたはパスワードが正しくありません。」のような、どちらが誤っているかを区別しない汎用メッセージを返す
- 会員登録: エンドポイントは提供しない。ユーザー追加は管理画面 API（後述）から行う
- パスワード再発行: ユーザー側からは実行できない。管理者が管理画面から再発行する（ユーザーには新しいパスコードがメールで届く）

### POST /auth/passcode/request

メールアドレスにパスコードを送付する。

> **organizationSlug について**: ブラウザからのアクセスはサブドメインで組織が特定されるためボディ不要だが、モバイルアプリや直接 API 呼び出しでサブドメインが使えないケースに備えてボディにも含める。サブドメインとボディが両方ある場合はサブドメインを優先する。

**リクエスト**
```json
{
  "email": "user@example.com",
  "organizationSlug": "sprout"
}
```

**レスポンス 200**
```json
{ "ok": true, "expiresInSec": 600 }
```

**エラー**
- 存在しないメールアドレス → それでも `200` を返す（メールアドレスの存在確認を防ぐため）
- 送付回数超過 → `429 RATE_LIMITED`

### POST /auth/passcode/verify

パスコードを検証してセッション Cookie を発行する。

**リクエスト**
```json
{
  "email": "user@example.com",
  "organizationSlug": "sprout",
  "passcode": "123456"
}
```

**レスポンス 200**
```json
{
  "user": {
    "id": "usr_01H...",
    "email": "user@example.com",
    "role": "member",
    "displayName": "田中 太郎"
  },
  "organization": {
    "id": "org_01H...",
    "slug": "sprout",
    "name": "Sprout"
  }
}
```
- Set-Cookie: `session=...; HttpOnly; Secure; SameSite=Lax`

**エラー**
- コード不一致 → `401 UNAUTHENTICATED`
- 有効期限切れ → `400 PASSCODE_EXPIRED`
- 検証済み再利用 → `409 PASSCODE_ALREADY_USED`
- ロックアウト中 → `429 RATE_LIMITED` + `Retry-After`

### GET /auth/me

現在のセッション情報。

---

## 組織設定

### GET /org/settings

ユーザーフロントがログイン直後に呼び出す。画面の色・文言・ロゴを組織ごとに切り替えるための情報。

**レスポンス 200**
```json
{
  "id": "org_01H...",
  "orgName": "Sprout",
  "productSubtitle": "オンボーディング Q&A",
  "logoUrl": "https://cdn.example.com/org/sprout/logo.png",
  "brandPrimary": "#84cc16",
  "welcomeHeroTitle": "今日は何を知りたいですか？",
  "welcomeHeroDescription": "勤怠・服装・店舗ルールまで、組織の資料からAIが答えます。",
  "askTabLabel": "質問する",
  "faqTabLabel": "よくある質問"
}
```

### PATCH /org/settings

管理画面から組織設定を更新する。**部分更新**（送信したフィールドのみ変更）。

**リクエスト**
```json
{
  "brandPrimary": "#0ea5e9",
  "welcomeHeroTitle": "何でも聞いてください"
}
```

**バリデーション**
- `brandPrimary`: `^#[0-9a-fA-F]{6}$`
- `orgName` / `welcomeHeroTitle` 等: 空文字禁止、最大 50 文字（説明文は 200 文字）

### POST /org/logo

`multipart/form-data` で画像をアップロード。PNG/SVG/JPG、最大 2MB。

**レスポンス 200**
```json
{ "logoUrl": "https://cdn.example.com/org/sprout/logo.png" }
```

> **フロー補足**: アップロード後、返却された `logoUrl` を使ってクライアントが続けて `PATCH /org/settings` を呼び出し `logoUrl` を保存する。2ステップが必要。

---

## 質問回答

会話は **Thread**（スレッド）と **Query**（スレッド内の1 turn）の2層構造で扱う。
- Thread: 1つの会話全体。`pinned` / `memo` はスレッド単位
- Query: スレッド内の各発話（質問 + 回答のペア）。`feedback` は Query 単位

### POST /threads

新しい会話スレッドを開始する（最初の質問を送信）。

**リクエスト**
```json
{ "question": "休憩は何分取れますか？" }
```

**レスポンス 201**
```json
{
  "id": "thr_01H...",
  "pinned": false,
  "memo": "",
  "createdAt": "2026-04-24T12:30:00Z",
  "updatedAt": "2026-04-24T12:30:00Z",
  "turns": [
    {
      "id": "qry_01H...",
      "turnIndex": 0,
      "question": "休憩は何分取れますか？",
      "result": {
        "kind": "answer",
        "answer": {
          "conclusion": "勤務が6時間を超える場合は45分…",
          "evidence": "就業規則 第4章…",
          "supplement": "休憩は勤務時間の途中で…",
          "caution": "休憩中はタイムカードを必ず切って…",
          "contact": "勤怠に関する質問は各店舗の店長…",
          "sources": [
            { "title": "就業規則.pdf", "section": "第18条 休憩時間", "documentId": "doc_..." }
          ]
        }
      },
      "matchedFaqId": "faq_01H...",
      "feedback": null,
      "createdAt": "2026-04-24T12:30:00Z"
    }
  ]
}
```

### POST /threads/:threadId/queries

既存スレッドに追加質問（次の turn）を投げる。サーバー側はスレッド内の直近 matched FAQ を参照して追加質問を文脈解決する。

**リクエスト**
```json
{ "question": "分割して取得できますか？" }
```

**レスポンス 201**
```json
{
  "id": "qry_02H...",
  "turnIndex": 1,
  "question": "分割して取得できますか？",
  "result": {
    "kind": "answer",
    "answer": { "conclusion": "分割取得は原則認められていません…", "..." : "…" }
  },
  "matchedFaqId": "faq_01H...",
  "feedback": null,
  "createdAt": "2026-04-24T12:31:30Z"
}
```

### GET /threads

自分のスレッド一覧。

**クエリパラメータ**
- `pinned=true|false`（省略時は全件）
- `cursor`, `limit`

**レスポンス 200**
```json
{
  "items": [
    {
      "id": "thr_01H...",
      "firstQuestion": "休憩は何分取れますか？",
      "turnCount": 3,
      "pinned": true,
      "memo": "次回の面談で質問する",
      "updatedAt": "2026-04-24T12:35:00Z"
    }
  ],
  "nextCursor": null
}
```

### GET /threads/:threadId

スレッドと全 turn を取得。

### PATCH /threads/:threadId

ピン / メモの更新。

**リクエスト**
```json
{ "pinned": true, "memo": "次回の面談で質問する" }
```

### PATCH /threads/:threadId/queries/:queryId

各 turn のフィードバックを更新。

**リクエスト**
```json
{ "feedback": "helpful" }
```

`feedback` は `"helpful" | "not-helpful" | null`。

### POST /threads/:threadId/queries/:queryId/escalations

特定の turn を担当者に送る。送信先は組織の `notification_channels` に設定されたチャネル（Slack / email）。担当者への個人指定は行わない。

**リクエスト**
```json
{ "message": "就業規則だけでなく、実際の運用も知りたいです。" }
```

**レスポンス 201**
```json
{ "id": "esc_01H...", "sentAt": "2026-04-24T12:40:00Z" }
```

---

## FAQ

### GET /faqs

**クエリパラメータ**
- `category` （カテゴリ ID）
- `sort`: `ranking` | `recent`
- `cursor`, `limit`

**レスポンス 200**
```json
{
  "items": [
    {
      "id": "faq_01H...",
      "categoryId": "cat_01H...",
      "question": "休憩は何分取れますか？",
      "askedCount": 124,
      "answer": { /* Answer と同じ */ },
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "nextCursor": null
}
```

### POST /faqs / PATCH /faqs/:id / DELETE /faqs/:id

管理者向け CRUD。

**下書き状態**: `POST /faqs` および `PATCH /faqs/:id` では `isPublished: boolean` を指定できる。`isPublished: false` の FAQ はユーザーフロントの `GET /faqs` に返却されない。デフォルトは `false`（下書き）。管理者が明示的に `isPublished: true` にするまで公開されない。

**リクエスト例 (POST)**
```json
{
  "categoryId": "cat_01H...",
  "question": "交通費の申請方法を教えてください",
  "answer": { "conclusion": "...", "evidence": "...", "contact": "...", "sources": [] },
  "isPublished": false
}
```

---

## カテゴリ

### GET /categories

```json
{
  "items": [
    { "id": "cat_01H...", "slug": "first-day", "name": "入社初日に多い質問", "sortOrder": 0 }
  ]
}
```

### POST / PATCH / DELETE `/categories/:id?`

管理者向け CRUD。`slug` は組織内で一意。

---

## 資料

### POST /documents

`multipart/form-data` でファイルをアップロード。

**フォーム**
- `file`: バイナリ
- `title`: 任意。省略時はファイル名
- `categoryId`: 任意

**エラー**
- ファイルサイズ超過（2MB超）→ `400 FILE_TOO_LARGE`
- 非対応形式（PDF・TXT 以外）→ `400 UNSUPPORTED_FILE_TYPE`

**レスポンス 201**
```json
{
  "id": "doc_01H...",
  "title": "就業規則.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 1204800,
  "uploadedAt": "..."
}
```

### GET /documents

管理画面で「今利用している出典の資料」を確認するための一覧。

### DELETE /documents/:id

紐づく質問履歴からは参照が残る（論理削除）。

---

## 管理

### GET /admin/unanswered

`result.kind === "not-found"` の質問一覧。`sort` は `recent | frequency`。

### GET /admin/ranking

**クエリパラメータ**
- `from`, `to`（期間指定、省略時は直近30日）
- `limit`

**レスポンス 200**
```json
{
  "items": [
    { "question": "休憩は何分取れますか？", "count": 124, "matchedFaqId": "faq_01H..." }
  ]
}
```

### GET / PATCH /admin/notifications

未回答発生時の通知先。

**レスポンス 200 (GET)**
```json
{
  "channels": [
    { "id": "ntf_01H...", "type": "slack", "destination": "https://hooks.slack.com/...", "enabled": true },
    { "id": "ntf_02H...", "type": "email", "destination": "admin@example.com", "enabled": false }
  ]
}
```

**リクエスト (PATCH)**
```json
{
  "channels": [
    { "type": "slack", "destination": "https://hooks.slack.com/...", "enabled": true }
  ]
}
```

---

## レートリミット

- 質問 (`POST /threads/:threadId/queries`): 10 req / 分 / ユーザー
- パスコード送付: 5 req / 1時間 / メール
- その他: 60 req / 分 / ユーザー

超過時は `429 RATE_LIMITED` を返す。レスポンスヘッダーに `Retry-After: <秒数>` を付与する。

```
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{ "error": { "code": "RATE_LIMITED", "message": "リクエストが多すぎます。しばらく待ってから再試行してください。", "details": { "retryAfterSec": 30 } } }
```

## モック実装での認証

ローカル開発・モック検証用に、API を経由しない簡易ログインを Next.js の Server Action として実装している。

- 固定資格情報: ID `admin` / パスワード `Zaq12wsx`
- セッションは httpOnly Cookie（`ob_session`）に保存、有効期限7日
- 未認証アクセスは `proxy.ts` が `/login` にリダイレクト
- 本実装時はこの Server Action を外し、本仕様書の `/auth/passcode/*` に統一する

## 備考

- API バージョン管理は URL プレフィックス（`/v1`）で行う
- 破壊的変更時は `/v2` を並行公開し、最低6ヶ月は `/v1` を維持する
- レスポンスのタイムスタンプはすべて UTC
