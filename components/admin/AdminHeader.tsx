"use client";

import Link from "next/link";
import { adminLogout } from "@/lib/auth";
import { useOrg } from "../OrgProvider";

type Props = {
  title: string;
  description?: string;
  onToggleSidebar: () => void;
};

export function AdminHeader({ title, description, onToggleSidebar }: Props) {
  const { profile } = useOrg();

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
      {/* モバイル用ハンバーガーボタン */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="shrink-0 rounded-md p-1.5 text-gray-600 hover:bg-gray-100 md:hidden"
        aria-label="メニューを開く"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-gray-900 sm:text-lg">{title}</h1>
        {description && (
          <p className="mt-0.5 hidden text-xs text-gray-500 sm:block">{description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden flex-col items-end text-right leading-tight sm:flex">
          <span className="text-xs font-medium text-gray-900">
            {profile.orgName}
          </span>
          <span className="text-[10px] text-gray-500">管理者としてログイン中</span>
        </div>

        <Link
          href="/"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:px-3"
        >
          ユーザー画面
        </Link>

        <form action={adminLogout}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-gray-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 sm:px-3"
          >
            ログアウト
          </button>
        </form>
      </div>
    </header>
  );
}
