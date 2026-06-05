"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrgLogo } from "../OrgLogo";
import { useOrg } from "../OrgProvider";

const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/faqs", label: "FAQ管理" },
  { href: "/admin/documents", label: "資料管理" },
  { href: "/admin/categories", label: "カテゴリ" },
  { href: "/admin/ranking", label: "質問ランキング" },
  { href: "/admin/escalations", label: "相談一覧" },
  { href: "/admin/unanswered", label: "未回答一覧" },
  { href: "/admin/users", label: "ユーザー管理" },
  { href: "/admin/settings", label: "組織設定" },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function AdminSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const { profile } = useOrg();

  return (
    <>
      {/* モバイル用バックドロップ */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={
          "fixed inset-y-0 left-0 z-40 flex h-full w-64 flex-col border-r border-slate-200 bg-slate-50 transition-transform duration-300 md:relative md:translate-x-0 " +
          (isOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4">
          <OrgLogo size={36} />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-gray-900">
              {profile.orgName}
            </span>
            <span className="text-[10px] text-gray-500">管理画面</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-gray-400 hover:bg-slate-200 hover:text-gray-600 md:hidden"
            aria-label="閉じる"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
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
                    onClick={onClose}
                    className={
                      "block rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 " +
                      (active
                        ? "bg-brand-600 text-white"
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
    </>
  );
}
