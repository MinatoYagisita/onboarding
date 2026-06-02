---
name: implement-scope
description: 開発スコープを順番に実装する（DB基盤 → Claude API → 認証 → 管理機能）
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
  - Glob
  - Grep
  - TodoWrite
---

# Scope 実装 Skill

> 前提: Next.js 16 / Prisma / @anthropic-ai/sdk / Zod / TypeScript

## この Skill を使う場面

- 新しい Scope の実装を開始するとき
- Scope 内のタスクを順番に進めるとき
- 実装後のチェックを行うとき

## 入力

- 実装対象の Scope 番号（例: Scope 1, Scope 2）
- current-state.md の実装優先度

## 実施手順

### Scope 1: DB 基盤

#### Step 1-1: パッケージ追加

```bash
pnpm add @prisma/client
pnpm add -D prisma
npx prisma init
```

#### Step 1-2: lib/db.ts（singleton）

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

#### Step 1-3: schema.prisma の記述ルール

db-design.md のテーブル定義をそのまま Prisma モデルに変換する。

- モデル名: PascalCase（例: `QueryThread`）
- テーブル名: `@@map("query_threads")` でスネークケースにマップ
- ID: `@default(cuid())`
- 論理削除: `deletedAt DateTime?`
- 作成日時: `@default(now())`
- 更新日時: `@updatedAt`

```prisma
model QueryThread {
  id             String    @id @default(cuid())
  organizationId String
  userId         String
  pinned         Boolean   @default(false)
  memo           String    @default("")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  organization Organization @relation(fields: [organizationId], references: [id])
  queries      Query[]

  @@map("query_threads")
}
```

#### Step 1-4: マイグレーションと Seed

```bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

Seed には以下を含める：
- organizations（slug: `sprout`）
- org_settings（デフォルトブランドカラー）
- categories（入社初日・勤怠・有給など）
- faqs（サンプル Q&A 数件）

---

### Scope 2: Claude API + チャット永続化

#### Step 2-1: パッケージ追加

```bash
pnpm add @anthropic-ai/sdk zod
```

#### Step 2-2: lib/claude.ts の構成

search-design.md のプロンプトキャッシュ設計に従う。

```ts
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";

const client = new Anthropic(); // ANTHROPIC_API_KEY を自動参照

export async function buildSystemPrompt(orgId: string): Promise<string> {
  const [faqs, documents] = await Promise.all([
    db.faq.findMany({ where: { organizationId: orgId, isPublished: true, deletedAt: null } }),
    db.document.findMany({ where: { organizationId: orgId, deletedAt: null } }),
  ]);
  // FAQ + 資料全文をシステムプロンプトに結合して返す
}

export async function askClaude(systemPrompt: string, messages: ...) {
  // tool_use で JSON レスポンスを強制
  // タイムアウト: 30 秒
  // 失敗時: AI_UNAVAILABLE (503) を呼び出し元で返す
}
```

#### Step 2-3: Claude レスポンスの Zod バリデーション

```ts
const AnswerSchema = z.object({
  conclusion: z.string(),
  evidence: z.string(),
  supplement: z.string().optional(),
  caution: z.string().optional(),
  contact: z.string(),
  sources: z.array(z.object({
    title: z.string(),
    section: z.string().optional(),
    documentId: z.string().optional(),
  })),
  matchedFaqId: z.string().nullable(),
});

const ClaudeResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("answer"), answer: AnswerSchema }),
  z.object({ kind: z.literal("not-found"), relatedFaqIds: z.array(z.string()) }),
]);
```

#### Step 2-4: 実装するエンドポイント

| ファイル | メソッド | 処理 |
|---|---|---|
| `app/api/threads/route.ts` | POST | 新規スレッド作成 + Claude 呼び出し + DB 保存 |
| `app/api/threads/route.ts` | GET | スレッド一覧取得 |
| `app/api/threads/[threadId]/route.ts` | GET | スレッド詳細（全 query 含む） |
| `app/api/threads/[threadId]/queries/route.ts` | POST | 追加質問 + Claude 呼び出し + DB 保存 |

#### Step 2-5: フロント切り替え

- `components/ChatView.tsx` の useState → API fetch に切り替え
- リロード後もスレッドが復元されることを確認

---

## 出力フォーマット

各 Scope 完了時に以下を確認する。

```markdown
## Scope X 完了チェックリスト

### DB（Scope 1 のみ）
- [ ] prisma migrate dev が通る
- [ ] prisma db seed でサンプルデータが入る
- [ ] lib/db.ts の singleton が機能している

### API ルート（Scope 2）
- [ ] POST /api/threads で Claude が回答を返す
- [ ] GET /api/threads でスレッド一覧が返る
- [ ] リロード後もチャット履歴が残る
- [ ] organizationId スコープが正しく機能している
- [ ] 500 エラーに内部情報が含まれない

### セキュリティ
- [ ] ANTHROPIC_API_KEY に NEXT_PUBLIC_ が付いていない
- [ ] .env.local が git に含まれていない
- [ ] implement-api-route の禁止事項をすべてクリアしている
```

## 禁止事項

- DB マイグレーションを飛ばして実装を進めない
- `organizationId` を WHERE 句に含めずにクエリしない
- Claude API のエラーをそのまま 500 レスポンスに含めない
- `ANTHROPIC_API_KEY` を `NEXT_PUBLIC_` 付きで定義しない
- Scope の順番（1 → 2 → 3）を飛ばして依存関係を無視しない
