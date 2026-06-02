import type { NextRequest } from "next/server";
import { db } from "./db";
import { AppError } from "./errors";
import { logger } from "./logger";

// ─── Org resolver ─────────────────────────────────────────────────────────────

export async function resolveOrg(req: NextRequest) {
  const slug =
    req.headers.get("x-organization-slug") ?? process.env.DEFAULT_ORG_SLUG;
  if (!slug) return null;
  return db.organization.findFirst({ where: { slug, deletedAt: null } });
}

// ─── 4xx response helpers（例外を使わず直接返す正常系エラー） ─────────────────

export function validationError(errors: { field: string; message: string }[]) {
  return Response.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "入力内容に誤りがあります",
        details: { errors },
      },
    },
    { status: 400 }
  );
}

export function notFound(message = "リソースが見つかりません") {
  return Response.json(
    { error: { code: "NOT_FOUND", message } },
    { status: 404 }
  );
}

export function forbidden(message = "権限がありません") {
  return Response.json(
    { error: { code: "FORBIDDEN", message } },
    { status: 403 }
  );
}

// ─── Error boundary ───────────────────────────────────────────────────────────

type ApiContext = {
  requestId: string;
  userId: string;
};

async function errorBoundary(
  path: string,
  req: NextRequest,
  fn: (ctx: ApiContext) => Promise<Response>
): Promise<Response> {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startedAt = Date.now();
  // Cookie 先頭8文字をセッション識別子としてログに使う（実ユーザーIDではない）
  const sessionHint = req.cookies.get("ob_session")?.value?.slice(0, 8) ?? req.cookies.get("ob_admin_session")?.value?.slice(0, 8) ?? "anonymous";

  try {
    return await fn({ requestId, userId: sessionHint });
  } catch (err) {
    const durationMs = Date.now() - startedAt;

    if (err instanceof AppError) {
      logger.error({
        requestId,
        path,
        method: req.method,
        sessionHint,
        durationMs,
        code: err.code,
        message: err.message,
        context: err.context,
      });
      return err.toResponse();
    }

    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error
      ? err.stack?.split("\n").slice(0, 6).join("\n")
      : undefined;

    logger.error({
      requestId,
      path,
      method: req.method,
      sessionHint,
      durationMs,
      code: "INTERNAL_ERROR",
      message,
      stack,
    });

    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "サーバーエラーが発生しました" } },
      { status: 500 }
    );
  }
}

/**
 * パラメータなしのルートハンドラをエラー境界で包む。
 * 使用例: export const GET = withApiHandler("GET /api/faqs", async (req) => { ... });
 */
export function withApiHandler(
  path: string,
  handler: (req: NextRequest, ctx: ApiContext) => Promise<Response>
) {
  return (req: NextRequest) => errorBoundary(path, req, (ctx) => handler(req, ctx));
}

/**
 * パラメータあり（動的ルート）のルートハンドラをエラー境界で包む。
 * 使用例:
 *   export const GET = withParamsHandler<{ threadId: string }>(
 *     "GET /api/threads/:threadId",
 *     async (req, { threadId }) => { ... }
 *   );
 */
export function withParamsHandler<P extends Record<string, string>>(
  path: string,
  handler: (req: NextRequest, params: P, ctx: ApiContext) => Promise<Response>
) {
  return async (
    req: NextRequest,
    { params }: { params: Promise<P> }
  ): Promise<Response> => {
    const resolvedParams = await params;
    return errorBoundary(path, req, (ctx) => handler(req, resolvedParams, ctx));
  };
}

// ─── 後方互換（既存ルートが使う internalError / aiUnavailable は削除） ────────
// 新規ルートでは throw new AiUnavailableError() / throw new AppError() を使う
