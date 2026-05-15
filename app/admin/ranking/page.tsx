import { AdminShell } from "@/components/admin/AdminShell";
import { FAQ_ITEMS } from "@/lib/mockData";
import { FAQ_CATEGORY_LABELS } from "@/types";

export default function AdminRankingPage() {
  const ranked = [...FAQ_ITEMS].sort((a, b) => b.askedCount - a.askedCount);
  const total = ranked.reduce((sum, f) => sum + f.askedCount, 0);

  return (
    <AdminShell
      title="質問ランキング"
      description="質問された回数の多い順の FAQ 一覧。対応改善の優先順位付けに使います。"
    >
      <div className="flex flex-col gap-4">
        <div className="text-xs text-gray-500">
          累計 {total} 件の質問 / {ranked.length} 件のFAQ
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-12">順位</th>
                <th className="px-4 py-3 text-left font-medium">質問</th>
                <th className="px-4 py-3 text-left font-medium">カテゴリ</th>
                <th className="px-4 py-3 text-right font-medium">質問回数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ranked.map((faq, i) => (
                <tr key={faq.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold " +
                        (i < 3
                          ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-gray-600")
                      }
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{faq.question}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {FAQ_CATEGORY_LABELS[faq.category]}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {faq.askedCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
