"use client";

import { useActionState } from "react";
import { adminLogin } from "@/lib/auth";
import { initialAdminLoginState } from "@/lib/authShared";

export function AdminLoginForm() {
  const [state, formAction, isPending] = useActionState(
    adminLogin,
    initialAdminLoginState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="admin-email"
          className="text-xs font-medium text-gray-700"
        >
          メールアドレス
        </label>
        <input
          id="admin-email"
          name="email"
          type="text"
          required
          autoComplete="email"
          autoFocus
          placeholder="admin@example.com"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="admin-password"
          className="text-xs font-medium text-gray-700"
        >
          パスワード
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
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
        className="mt-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isPending ? "認証中..." : "管理画面にログイン"}
      </button>

      <p className="border-t border-gray-100 pt-3 text-xs text-gray-500 leading-relaxed">
        最初の管理者アカウントは GrowDays が発行します。追加の管理者は、組織内の既存管理者がこの管理画面から登録します。
      </p>
    </form>
  );
}
