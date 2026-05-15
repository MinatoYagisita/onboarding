// Server Action (`"use server"`) ファイルからは async 関数しか export できないため、
// Cookie 名・型・初期値などの non-function な値はこちらに分けて管理する。

/** ユーザーフロント用セッション Cookie */
export const SESSION_COOKIE = "ob_session";
/** 管理画面用セッション Cookie（フロントとは別） */
export const ADMIN_SESSION_COOKIE = "ob_admin_session";

export type LoginState = {
  error: string | null;
};

export const initialLoginState: LoginState = { error: null };

export type AdminLoginState = {
  error: string | null;
};

export const initialAdminLoginState: AdminLoginState = { error: null };
