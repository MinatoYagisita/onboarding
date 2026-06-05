"use client";

import Link from "next/link";

type Item = {
  question: string;
  count: number;
  lastAskedAt: string;
};

export function UnansweredManager({ initialItems }: { initialItems: Item[] }) {
  if (initialItems.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-gray-500">
        未回答の質問はありません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-amber-50 text-xs uppercase tracking-wide text-amber-900">
            <tr>
              <th className="px-4 py-3 text-left font-medium">質問</th>
              <th className="px-4 py-3 text-right font-medium">質問回数</th>
              <th className="px-4 py-3 text-left font-medium">最終質問日時</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {initialItems.map((item) => (
              <tr key={item.question} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-gray-900">{item.question}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{item.count}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(item.lastAskedAt).toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/faqs?q=${encodeURIComponent(item.question)}`}
                    className="text-xs text-brand-600 hover:text-brand-700"
                  >
                    FAQに追加
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        ※ FAQや資料を追加すると、次回同じ質問が来たときに自動で回答されます。
      </p>
    </div>
  );
}
