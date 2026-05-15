"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE,
  type AdminLoginState,
  type LoginState,
} from "./authShared";

// モック用の固定資格情報。
// 本番実装では Auth.js + passcode 認証（フロント）/ Auth.js + パスワード認証（管理画面）に差し替える。
const MOCK_CREDENTIALS = {
  email: "admin",
  password: "Zaq12wsx",
};

const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // メアド / パスワードの一致はセキュリティ上の理由で「どちらが誤りか」を返さない。
  if (
    email !== MOCK_CREDENTIALS.email ||
    password !== MOCK_CREDENTIALS.password
  ) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, "mock-session-token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

/**
 * 管理画面ログイン（モック）。
 * 本番実装では組織はサブドメインで特定されるため、入力はメールアドレス + パスワードの2項目で足りる。
 * モックではメアドは任意文字列を受け取り、パスワードのみ MOCK_CREDENTIALS と比較する。
 */
export async function adminLogin(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) {
    return { error: "メールアドレスを入力してください。" };
  }

  if (password !== MOCK_CREDENTIALS.password) {
    return { error: "メールアドレスまたはパスワードが正しくありません。" };
  }

  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, "mock-admin-session-token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });

  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}
