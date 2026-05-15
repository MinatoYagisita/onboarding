"use client";

import { useActionState } from "react";
import { login } from "@/lib/auth";
import { initialLoginState } from "@/lib/authShared";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    login,
    initialLoginState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="login-email"
          className="text-xs font-medium text-gray-700"
        >
          メールアドレス
        </label>
        <input
          id="login-email"
          name="email"
          type="text"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="login-password"
          className="text-xs font-medium text-gray-700"
        >
          パスワード
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
        />
      </div>

      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isPending ? "認証中..." : "ログイン"}
      </button>

      <p className="border-t border-gray-100 pt-3 text-xs text-gray-500 leading-relaxed">
        パスワードの再発行はご自身では行えません。所属組織の管理者にご連絡のうえ、再発行を依頼してください。
      </p>
    </form>
  );
}
