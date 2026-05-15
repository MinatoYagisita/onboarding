"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrgLogo } from "../OrgLogo";
import { useOrg } from "../OrgProvider";

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/settings", label: "組織設定" },
  { href: "/admin/categories", label: "カテゴリ" },
  { href: "/admin/ranking", label: "質問ランキング" },
  { href: "/admin/unanswered", label: "未回答一覧" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { profile } = useOrg();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
        <OrgLogo size={36} />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold text-gray-900">
            {profile.orgName}
          </span>
          <span className="text-[10px] text-gray-500">管理画面</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    "block rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 " +
                    (active
                      ? "bg-slate-800 text-white"
                      : "text-gray-700 hover:bg-slate-200")
                  }
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
