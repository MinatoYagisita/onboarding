"use client";

import Link from "next/link";
import { adminLogout } from "@/lib/auth";
import { useOrg } from "../OrgProvider";

type Props = {
  title: string;
  description?: string;
};

export function AdminHeader({ title, description }: Props) {
  const { profile } = useOrg();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden flex-col items-end text-right leading-tight sm:flex">
          <span className="text-xs font-medium text-gray-900">
            {profile.orgName}
          </span>
          <span className="text-[10px] text-gray-500">管理者としてログイン中</span>
        </div>

        <Link
          href="/"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          ユーザー画面へ
        </Link>

        <form action={adminLogout}>
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            ログアウト
          </button>
        </form>
      </div>
    </header>
  );
}
