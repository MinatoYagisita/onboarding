export const dynamic = "force-dynamic";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { getDefaultOrg } from "@/lib/server-org";
import { db } from "@/lib/db";

export default async function AdminDashboardPage() {
  const org = await getDefaultOrg();

  if (!org) {
    return (
      <AdminShell title="ダッシュボード">
        <p className="text-sm text-gray-500">組織が見つかりません。</p>
      </AdminShell>
    );
  }

  const [totalFaqs, totalQueries, totalUnanswered, topFaqs] = await Promise.all([
    db.faq.count({ where: { organizationId: org.id, deletedAt: null } }),
    db.query.count({ where: { organizationId: org.id, deletedAt: null } }),
    db.query.count({ where: { organizationId: org.id, deletedAt: null, resultKind: "not_found" } }),
    db.faq.findMany({
      where: { organizationId: org.id, deletedAt: null },
      orderBy: { askedCount: "desc" },
      take: 3,
    }),
  ]);

  return (
    <AdminShell title="ダッシュボード" description="組織全体の質問状況サマリ">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat label="登録されているFAQ" value={totalFaqs} suffix="件" />
          <Stat label="累計質問数" value={totalQueries} suffix="件" />
          <Stat label="未回答" value={totalUnanswered} suffix="件" warning />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">よく質問される項目 Top 3</h2>
            <Link href="/admin/ranking" className="text-xs text-blue-600 hover:underline">
              すべて見る
            </Link>
          </div>
          {topFaqs.length === 0 ? (
            <p className="text-sm text-gray-500">まだ質問はありません。</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {topFaqs.map((faq, i) => (
                <li
                  key={faq.id}
                  className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50/40 px-3 py-2"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{faq.question}</span>
                  <span className="shrink-0 text-xs text-gray-500">{faq.askedCount}回</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {totalUnanswered > 0 && (
          <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-amber-900">
                未回答の質問が {totalUnanswered} 件あります
              </h2>
              <Link href="/admin/unanswered" className="text-xs text-amber-800 hover:underline">
                対応する
              </Link>
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  suffix,
  warning,
}: {
  label: string;
  value: number;
  suffix?: string;
  warning?: boolean;
}) {
  return (
    <div className={"rounded-xl border bg-white p-5 " + (warning ? "border-amber-200" : "border-slate-200")}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={"mt-1 text-3xl font-semibold " + (warning ? "text-amber-700" : "text-gray-900")}>
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-gray-500">{suffix}</span>}
      </div>
    </div>
  );
}
