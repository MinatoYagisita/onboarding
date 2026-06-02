export const dynamic = "force-dynamic";
import { AdminShell } from "@/components/admin/AdminShell";
import { getDefaultOrg } from "@/lib/server-org";
import { db } from "@/lib/db";

export default async function AdminRankingPage() {
  const org = await getDefaultOrg();

  if (!org) {
    return (
      <AdminShell title="質問ランキング">
        <p className="text-sm text-gray-500">組織が見つかりません。</p>
      </AdminShell>
    );
  }

  const [faqs, total] = await Promise.all([
    db.faq.findMany({
      where: { organizationId: org.id, deletedAt: null },
      orderBy: { askedCount: "desc" },
      include: { category: true },
    }),
    db.query.count({ where: { organizationId: org.id, deletedAt: null } }),
  ]);

  return (
    <AdminShell
      title="質問ランキング"
      description="質問された回数の多い順の FAQ 一覧。対応改善の優先順位付けに使います。"
    >
      <div className="flex flex-col gap-4">
        <div className="text-xs text-gray-500">
          累計 {total} 件の質問 / {faqs.length} 件のFAQ
        </div>

        {faqs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-gray-500">
            FAQが登録されていません。
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="w-12 px-4 py-3 text-left font-medium">順位</th>
                  <th className="px-4 py-3 text-left font-medium">質問</th>
                  <th className="px-4 py-3 text-left font-medium">カテゴリ</th>
                  <th className="px-4 py-3 text-left font-medium">状態</th>
                  <th className="px-4 py-3 text-right font-medium">質問回数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faqs.map((faq, i) => (
                  <tr key={faq.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span
                        className={
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold " +
                          (i < 3 ? "bg-slate-800 text-white" : "bg-slate-100 text-gray-600")
                        }
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{faq.question}</td>
                    <td className="px-4 py-3 text-gray-600">{faq.category?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      {faq.isPublished ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">公開</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">下書き</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{faq.askedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
