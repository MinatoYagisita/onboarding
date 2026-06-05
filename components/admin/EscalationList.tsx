"use client";

import { useState } from "react";

type Item = {
  id: string;
  sentAt: string;
  question: string;
  message: string;
  senderName: string;
  status: string;
};

export function EscalationList({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/escalations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item)),
      );
    }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-gray-500">
        相談はまだありません。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left font-medium">送信日時</th>
            <th className="px-4 py-3 text-left font-medium">元の質問</th>
            <th className="px-4 py-3 text-left font-medium">相談内容</th>
            <th className="px-4 py-3 text-left font-medium">送信者</th>
            <th className="px-4 py-3 text-left font-medium">ステータス</th>
            <th className="px-4 py-3 text-left font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((e) => (
            <tr key={e.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {new Date(e.sentAt).toLocaleString("ja-JP")}
              </td>
              <td className="px-4 py-3 text-gray-900 max-w-xs">
                <p className="truncate">{e.question}</p>
              </td>
              <td className="px-4 py-3 text-gray-700 max-w-sm">
                <p className="line-clamp-2 whitespace-pre-wrap">{e.message}</p>
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                {e.senderName}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={e.status} />
              </td>
              <td className="px-4 py-3">
                {e.status === "pending" && (
                  <button
                    onClick={() => updateStatus(e.id, "handled")}
                    className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                  >
                    対応済みにする
                  </button>
                )}
                {e.status === "handled" && (
                  <button
                    onClick={() => updateStatus(e.id, "pending")}
                    className="rounded bg-gray-50 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    戻す
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">対応待ち</span>;
  }
  if (status === "handled") {
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">対応済み</span>;
  }
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{status}</span>;
}
