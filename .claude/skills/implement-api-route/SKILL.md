---
name: implement-api-route
description: このプロジェクトに新しい API ルートを追加する（Next.js 16 / Prisma / Zod 前提）
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
  - Glob
  - Grep
---

# API ルート実装 Skill

> 前提: Next.js 16 / Prisma / Zod / TypeScript

## この Skill を使う場面

- api-spec.md に記載されたエンドポイントを新たに実装するとき
- 既存の API ルートに HTTP メソッドを追加するとき
- フロントの useState をサーバー API に切り替えるとき

## 入力

- 実装対象のエンドポイント（例: `POST /api/threads`）
- api-spec.md の該当セクション
- db-design.md の関連テーブル定義

## 実施手順

### Step 1: ファイル配置の決定

api-spec.md のパスに対応する Next.js のファイル構成を確認する。

```
app/api/
  threads/
    route.ts                        # GET（一覧）/ POST（新規）
    [threadId]/
      route.ts                      # GET（詳細）/ PATCH / DELETE
      queries/
        route.ts                    # POST（追加質問）
        [queryId]/
          route.ts                  # PATCH（フィードバック）
          escalations/
            route.ts                # POST
  org/
    settings/route.ts
    logo/route.ts
  faqs/
    route.ts
    [id]/route.ts
  categories/
    route.ts
    [id]/route.ts
```

### Step 2: Zod スキーマの定義

リクエストボディを Zod で定義する。`safeParse` を使い、失敗時は api-spec.md の形式でエラーを返す。

```ts
const PostSchema = z.object({
  question: z.string().min(1).max(1000),
});

const parsed = PostSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "入力内容に誤りがあります",
        details: {
          errors: parsed.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
      },
    },
    { status: 400 }
  );
}
```

### Step 3: organizationId の取得（暫定）

認証（Scope 3）完了前は `x-organization-slug` ヘッダーまたは環境変数から取得する。

```ts
async function getOrg(req: NextRequest) {
  const slug =
    req.headers.get("x-organization-slug") ?? process.env.DEFAULT_ORG_SLUG;
  const org = await db.organization.findFirst({
    where: { slug: slug!, deletedAt: null },
  });
  if (!org) throw new Error("organization not found");
  return org;
}
```

### Step 4: Prisma クエリの実装

- `WHERE deletedAt: null` を必ず含める（論理削除対応）
- `WHERE organizationId` を必ず含める（マルチテナント）
- 存在確認が必要なリソースは `findFirst` で取得し、null なら 404 を返す

```ts
const thread = await db.queryThread.findFirst({
  where: { id: params.threadId, organizationId: org.id, deletedAt: null },
  include: { queries: { orderBy: { turnIndex: "asc" } } },
});
if (!thread) {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "スレッドが見つかりません" } },
    { status: 404 }
  );
}
```

### Step 5: エラーハンドリング

try/catch で全体を囲み、500 エラーに内部情報を含めない。

```ts
try {
  // ...実装
} catch (err) {
  console.error("[POST /api/threads]", err); // サーバーログにのみ出力
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました" } },
    { status: 500 }
  );
}
```

Claude API のタイムアウト・障害は `AI_UNAVAILABLE` (503) を返す。

## 出力フォーマット

実装完了後に以下を確認してチェックする。

```markdown
## 実装完了チェックリスト

- [ ] Zod バリデーションがある（safeParse + 400 返却）
- [ ] organizationId のスコープが WHERE 句にある
- [ ] deletedAt: null が WHERE 句にある
- [ ] 404 は NOT_FOUND コードで返している
- [ ] 500 のレスポンスに内部情報（スタックトレース・SQLエラー）が含まれていない
- [ ] Claude API 障害は 503 AI_UNAVAILABLE で返している
- [ ] console.error はサーバーログのみ（レスポンスには入れない）
```

## 禁止事項

- `NEXT_PUBLIC_` プレフィックスをサーバー専用の環境変数に付けない（`ANTHROPIC_API_KEY` など）
- エラーレスポンスに Prisma のエラーオブジェクトや SQL 文をそのまま含めない
- `organizationId` なしで DB クエリしない
- クライアントサイドのバリデーションだけに依存しない（サーバーで必ず検証する）
- `prisma.$executeRawUnsafe` を使わない
