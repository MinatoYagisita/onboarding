/**
 * アプリケーション例外の基底クラス。
 * 5xx 系（AI障害・DB障害・予期しない例外）にのみ使用する。
 * 4xx（バリデーション・not-found・forbidden）は Response.json() で直接返す。
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    // V8 以外でもスタックトレースを保持する
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }

  toResponse(): Response {
    return Response.json(
      { error: { code: this.code, message: this.message } },
      { status: this.status }
    );
  }
}

/** AI サービス（Groq / Anthropic）の呼び出し失敗 */
export class AiUnavailableError extends AppError {
  constructor(context?: Record<string, unknown>) {
    super(
      "AI_UNAVAILABLE",
      503,
      "AIサービスが一時的に利用できません。しばらく待ってから再試行してください。",
      context
    );
  }
}

/** 外部ストレージ（Drive / Box）の操作失敗 */
export class StorageError extends AppError {
  constructor(context?: Record<string, unknown>) {
    super("STORAGE_ERROR", 502, "外部ストレージの操作に失敗しました", context);
  }
}

/** 未認証（Cookie なし or セッション期限切れ） */
export class UnauthenticatedError extends AppError {
  constructor() {
    super("UNAUTHENTICATED", 401, "ログインが必要です");
  }
}

/** 認証済みだが権限不足 */
export class ForbiddenError extends AppError {
  constructor(message = "権限がありません") {
    super("FORBIDDEN", 403, message);
  }
}
