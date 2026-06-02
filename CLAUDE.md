@.claude/rules/agents.md
@.claude/rules/current-state.md
@.claude/rules/search-design.md
@.claude/rules/user-flow.md
@.claude/rules/api-spec.md
@.claude/rules/db-design.md
@.claude/rules/integration-design.md

# セキュリティルール

`.env.local` は機密情報（APIキー・シークレット・パスワード）を含むため、絶対に読み込まないこと。

# テスト

## テスト仕様書

`.claude/skills/test-spec-creator/test-spec.html` — 全機能の TC-ID 付きテストケース一覧（Vitest / Playwright 振り分け済み）

## テストコード

| ファイル | 対象 | ツール |
|---|---|---|
| `tests/lib/passcode.test.ts` | generateCode / hashCode / passcodeExpiresAt | Vitest |
| `tests/lib/notify.test.ts` | escapeHtml XSS・Slack/メール通知 | Vitest |
| `tests/api/threads.test.ts` | スレッド作成・turnCount・askedCount スコープ | Vitest |
| `tests/api/auth.test.ts` | パスコード認証・ロックアウト・未認証 401 | Vitest |
| `tests/api/ranking.test.ts` | ランキング API・権限チェック | Vitest |
| `e2e/auth.spec.ts` | 未認証リダイレクト・ログインフォーム | Playwright |
| `e2e/chat.spec.ts` | 質問送信・履歴・ピン留め | Playwright |
| `e2e/admin.spec.ts` | ランキング・カテゴリ・エスカレーション・設定 | Playwright |

## 実行コマンド

```bash
pnpm test            # Vitest（全ユニットテスト）
pnpm test:watch      # Vitest ウォッチモード
pnpm test:coverage   # カバレッジ付き
pnpm test:e2e        # Playwright E2E（要 dev サーバー起動）
pnpm test:e2e:ui     # Playwright UI モード
```

## 前提条件

- Vitest: DB 不要（db / session / claude をモック）
- Playwright: `pnpm dev` でサーバーを起動してから実行。`/api/auth/mock-login` が有効な開発環境が必要
