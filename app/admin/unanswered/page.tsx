import { AdminShell } from "@/components/admin/AdminShell";
import { UNANSWERED_ITEMS } from "@/lib/mockData";

export default function AdminUnansweredPage() {
  return (
    <AdminShell
      title="未回答一覧"
      description="回答が見つからなかった質問の一覧。資料追加・FAQ登録の対象候補です。"
    >
      <div className="flex flex-col gap-4">
        {UNANSWERED_ITEMS.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-gray-500">
            未回答の質問はありません。
          </p>
        ) : (
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
                {UNANSWERED_ITEMS.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-gray-900">{item.question}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {item.askedCount}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(item.lastAskedAt).toLocaleString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-gray-400"
                        title="モックでは無効（後続フェーズで実装）"
                      >
                        FAQ化（準備中）
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-gray-500">
          ※ 未回答発生時は通知チャネル（Slack 等）にも送信されます。設定は通知設定から。
        </p>
      </div>
    </AdminShell>
  );
}
