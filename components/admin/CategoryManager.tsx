"use client";

import { useState } from "react";

type Category = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  faqCount: number;
};

export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim() || !newSlug.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), slug: newSlug.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "エラーが発生しました");
        return;
      }
      const created: Category = await res.json();
      setCategories((prev) => [...prev, created]);
      setNewName("");
      setNewSlug("");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "エラーが発生しました");
        return;
      }
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("削除に失敗しました");
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {/* 追加フォーム */}
      <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">カテゴリ名</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="例: 勤怠・シフト"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-700">スラッグ（英数字・ハイフン）</label>
          <input
            type="text"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="例: attendance"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !newName.trim() || !newSlug.trim()}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          ＋ 追加
        </button>
      </div>

      {/* 一覧 */}
      {categories.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-gray-500">
          カテゴリがありません。上のフォームから追加してください。
        </p>
      ) : (
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
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {editingId === cat.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      cat.name
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{cat.faqCount}</td>
                  <td className="px-4 py-3 text-right">
                    {editingId === cat.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(cat.id)}
                          disabled={saving}
                          className="text-xs text-brand-600 hover:underline disabled:opacity-40"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:underline"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          disabled={saving || cat.faqCount > 0}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30"
                          title={cat.faqCount > 0 ? "FAQが残っているため削除できません" : "削除"}
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
