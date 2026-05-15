import { AdminShell } from "@/components/admin/AdminShell";
import { FAQ_ITEMS } from "@/lib/mockData";
import { FAQ_CATEGORY_LABELS, type FaqCategory } from "@/types";

type CategoryRow = {
  slug: FaqCategory;
  name: string;
  faqCount: number;
};

export default function AdminCategoriesPage() {
  const rows: CategoryRow[] = (
    Object.keys(FAQ_CATEGORY_LABELS) as FaqCategory[]
  ).map((slug) => ({
    slug,
    name: FAQ_CATEGORY_LABELS[slug],
    faqCount: FAQ_ITEMS.filter((f) => f.category === slug).length,
  }));

  return (
    <AdminShell
      title="カテゴリ"
      description="FAQ・質問の分類に使うカテゴリを管理します。"
    >
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-gray-400"
            title="モックでは追加不可（後続フェーズで実装）"
          >
            ＋ カテゴリを追加（準備中）
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">カテゴリ名</th>
                <th className="px-4 py-3 text-left font-medium">スラッグ</th>
                <th className="px-4 py-3 text-right font-medium">FAQ件数</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.slug} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {row.slug}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {row.faqCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled
                      className="cursor-not-allowed text-xs text-gray-400"
                      title="モックでは編集不可"
                    >
                      編集
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500">
          ※ モックでは追加・編集・削除は無効化しています。カテゴリは現在、コード定数（`FAQ_CATEGORY_LABELS`）で管理されます。
        </p>
      </div>
    </AdminShell>
  );
}
