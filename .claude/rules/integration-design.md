# 外部ストレージ連携設計 - Google Drive / Box

## 概要

組織の管理者が Google Drive または Box のフォルダを指定すると、フォルダ内のファイルを定期的に取り込み、Claude の検索対象（`documents`）に同期する機能。

- **対応プロバイダ**: Google Drive、Box（同時対応）
- **同期方式**: バックグラウンドのポーリング（定期実行）
- **選択粒度**: フォルダ単位（指定フォルダ以下のファイルを全取得）
- **認証**: 組織ごとに管理者が自分のアカウントで OAuth 認可

---

## 環境変数

| 変数名 | 説明 |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `BOX_CLIENT_ID` | Box OAuth クライアント ID |
| `BOX_CLIENT_SECRET` | Box OAuth クライアントシークレット |
| `ENCRYPTION_KEY` | リフレッシュトークン暗号化キー（32バイト hex） |
| `SYNC_INTERVAL_HOURS` | 同期間隔（デフォルト: 1） |
| `APP_BASE_URL` | OAuth コールバック URL のベース（例: `https://app.example.com`） |

---

## DB スキーマ追加

### 新テーブル: `drive_connections`（外部ストレージ接続）

組織と外部ストレージプロバイダの接続情報。1組織につき各プロバイダ1件まで。

| カラム（物理名） | 論理名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| id | 接続ID | TEXT | PK | |
| organization_id | 組織ID | TEXT | FK→organizations.id | |
| provider | プロバイダ | TEXT | NOT NULL, CHECK IN ('google_drive','box') | |
| folder_id | フォルダID | TEXT | NULL 許容 | Drive/Box 上のフォルダ ID（OAuth 後に設定） |
| folder_name | フォルダ名 | TEXT | NULL 許容 | 管理画面での表示用 |
| encrypted_refresh_token | 暗号化リフレッシュトークン | TEXT | NOT NULL | AES-256-GCM で暗号化して保存 |
| sync_enabled | 自動同期フラグ | BOOLEAN | NOT NULL DEFAULT true | false にすると定期同期をスキップ |
| last_synced_at | 最終同期日時 | TIMESTAMPTZ | NULL 許容 | 成功した直近の同期日時 |
| last_sync_error | 最終エラー | TEXT | NULL 許容 | 直近のエラーメッセージ（管理画面で表示） |
| created_at | 接続日時 | TIMESTAMPTZ | NOT NULL | |
| updated_at | 更新日時 | TIMESTAMPTZ | NOT NULL | |

**ユニーク**: `(organization_id, provider)`

### `documents` テーブルへの追加カラム

| カラム（物理名） | 論理名 | 型 | 制約 | 説明 |
|---|---|---|---|---|
| source_type | 取り込み元 | TEXT | NOT NULL DEFAULT 'upload', CHECK IN ('upload','google_drive','box') | |
| external_id | 外部ファイルID | TEXT | NULL 許容 | Drive/Box 上のファイル ID（重複チェックに使用） |
| external_modified_at | 外部更新日時 | TIMESTAMPTZ | NULL 許容 | Drive/Box 側のファイル更新日時（変更検知に使用） |

**インデックス**: `(organization_id, external_id)` — 重複チェック用

---

## API エンドポイント

| メソッド | パス | 権限 | 概要 |
|---|---|---|---|
| GET | `/org/integrations` | admin | 接続済みプロバイダ一覧と状態を取得 |
| POST | `/org/integrations/:provider/auth` | admin | OAuth 認証 URL を生成して返す |
| GET | `/org/integrations/:provider/callback` | public（OAuth コールバック） | 認証コードを受け取りトークンを保存 |
| PATCH | `/org/integrations/:provider` | admin | フォルダ指定・同期ON/OFF |
| POST | `/org/integrations/:provider/sync` | admin | 手動で即時同期をトリガー |
| DELETE | `/org/integrations/:provider` | admin | 接続解除（関連 document は論理削除） |

`:provider` は `google-drive` または `box`。

### GET /org/integrations

**レスポンス 200**
```json
{
  "providers": [
    {
      "provider": "google_drive",
      "connected": true,
      "folderId": "1abc...",
      "folderName": "社内規程",
      "syncEnabled": true,
      "lastSyncedAt": "2026-05-15T10:00:00Z",
      "lastSyncError": null
    },
    {
      "provider": "box",
      "connected": false
    }
  ]
}
```

### POST /org/integrations/:provider/auth

OAuth 認証フローを開始する。フロントはここで取得した URL にリダイレクトする。

**レスポンス 200**
```json
{ "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..." }
```

`state` パラメータに `organizationId` と `CSRF トークン` を含める（改ざん検知）。

### GET /org/integrations/:provider/callback

Drive/Box からのリダイレクト先。クエリパラメータ `code` と `state` を受け取る。

- `state` を検証して CSRF を防ぐ
- `code` でアクセストークン・リフレッシュトークンを取得
- リフレッシュトークンを `ENCRYPTION_KEY` で AES-256-GCM 暗号化して DB 保存
- 成功後は管理画面の連携設定ページにリダイレクト

### PATCH /org/integrations/:provider

フォルダ指定・同期設定の更新。

**リクエスト**
```json
{
  "folderId": "1abc...",
  "folderName": "社内規程",
  "syncEnabled": true
}
```

---

## 同期フロー（ポーリング）

### スケジュール

`SYNC_INTERVAL_HOURS` 間隔で全組織の接続を処理する。Next.js では `instrumentation.ts` または外部 cron（Vercel Cron / AWS EventBridge）から `POST /api/internal/sync` を叩く。

```
定期実行:
  1. drive_connections WHERE sync_enabled = true を全件取得
  2. 各接続に対して syncDriveConnection(connection) を実行（並列可）
```

### `syncDriveConnection(connection)` の処理

```
1. リフレッシュトークンを復号してアクセストークンを取得
2. フォルダ内のファイル一覧を Drive/Box API から取得
   - 対応 MIME: PDF / プレーンテキスト / Google Docs（Drive のみ）/ Word (.docx)
3. DB の documents WHERE organization_id AND external_id IN (取得ファイルの外部ID) を取得
4. ファイルごとに判定:
   a. external_id が DB にない → 新規取り込み
   b. external_modified_at が変わっている → 再取り込み（上書き更新）
   c. DB にあってフォルダから消えた → 論理削除（deletedAt をセット）
5. drive_connections.last_synced_at を更新
6. エラー発生時は last_sync_error に保存（同期を止めずに次回リトライ）
```

### ファイル取り込みの処理

```
1. Drive/Box API でファイルをダウンロード（または Google Docs は PDF エクスポート）
2. テキスト抽出:
   - PDF  → pdfjs-dist でテキスト抽出
   - DOCX → mammoth でテキスト抽出
   - TXT  → そのまま読む
   - Google Docs → Drive API で text/plain にエクスポート
3. 抽出テキストを S3 互換ストレージに保存（storageKey）
4. documents テーブルに UPSERT（external_id でキー）
```

---

## 対応ファイル形式

| 形式 | Google Drive | Box | 備考 |
|---|---|---|---|
| PDF (.pdf) | ✅ | ✅ | pdfjs-dist でテキスト抽出 |
| プレーンテキスト (.txt) | ✅ | ✅ | |
| Google ドキュメント (Docs) | ✅ | — | text/plain でエクスポート |
| Word (.docx) | ✅ | ✅ | mammoth でテキスト抽出 |
| Excel / Sheets | ❌ | ❌ | MVP スコープ外 |
| 画像・スキャン PDF | ❌ | ❌ | OCR は将来対応 |

ファイルサイズ上限: 10MB（大きいファイルはスキップして `last_sync_error` に記録）

---

## セキュリティ要件

- リフレッシュトークンは必ず **AES-256-GCM** で暗号化してから DB に保存する（`ENCRYPTION_KEY` は Secrets Manager 等で管理）
- OAuth の `state` パラメータに短命の CSRF トークンを含め、コールバック時に検証する
- Drive/Box API への呼び出しは **サーバーサイドのみ**（クライアントにトークンを露出しない）
- フォルダ外のファイルはアクセスしない（指定フォルダの読み取り権限のみ要求）
- Google Drive の OAuth スコープ: `https://www.googleapis.com/auth/drive.readonly`
- Box の OAuth スコープ: `root_readonly`

---

## エラーハンドリング

| エラー | 対処 |
|---|---|
| トークン失効（401） | `last_sync_error` にエラーを記録 + 管理者にメール通知（任意） |
| ファイルサイズ超過 | そのファイルをスキップ、エラーログに記録 |
| テキスト抽出失敗 | スキップ、エラーログに記録 |
| Drive/Box API レート制限 | exponential backoff でリトライ（最大3回） |
| フォルダが削除された | 全ファイルを論理削除、`last_sync_error` に記録 |

---

## 未決定事項（実装前に確認が必要）

| 項目 | 選択肢 | 推奨 |
|---|---|---|
| サブフォルダの再帰取得 | する / しない | する（1階層のみ or 全階層） |
| 同名ファイルの扱い | external_id で管理するので名前は無関係 | — |
| 接続解除時の document 処理 | 論理削除 / 残す | 論理削除 |
| 同期失敗の通知先 | notification_channels に送る / メールのみ | notification_channels |
| フォルダ選択 UI | テキスト入力（ID直打ち）/ フォルダブラウザ | フォルダブラウザ（Drive/Box の Picker API） |
