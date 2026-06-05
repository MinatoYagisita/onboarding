"use client";

import { useState, useEffect, useCallback } from "react";

type User = {
  id: string;
  email: string;
  displayName: string;
  role: "member" | "admin";
  joinedAt: string;
  lastLoginAt: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  member: "メンバー",
  admin: "管理者",
};

export function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ email: "", displayName: "", role: "member" as "member" | "admin" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (!res.ok) return;
    const json = await res.json();
    setUsers(json.items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    setFormError(null);
    if (!form.email.trim() || !form.displayName.trim()) {
      setFormError("メールアドレスと表示名は必須です。");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.status === 409) {
      setFormError("このメールアドレスは既に登録されています。");
      return;
    }
    if (!res.ok) {
      setFormError("追加に失敗しました。");
      return;
    }
    setForm({ email: "", displayName: "", role: "member" });
    setAdding(false);
    await load();
  }

  async function handleRoleChange(id: string, role: "member" | "admin") {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  async function handleDelete(id: string, email: string) {
    if (!confirm(`${email} をこの組織から削除しますか？`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
  }

  if (loading) return <div className="text-sm text-gray-400">読み込み中...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">ユーザー</th>
              <th className="px-4 py-3 text-left font-medium">ロール</th>
              <th className="px-4 py-3 text-left font-medium">参加日</th>
              <th className="px-4 py-3 text-left font-medium">最終ログイン</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{u.displayName}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as "member" | "admin")}
                    className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                  >
                    <option value="member">メンバー</option>
                    <option value="admin">管理者</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {new Date(u.joinedAt).toLocaleDateString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {u.lastLoginAt
                    ? new Date(u.lastLoginAt).toLocaleDateString("ja-JP")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(u.id, u.email)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-400">
                  ユーザーがいません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <input
              type="email"
              placeholder="メールアドレス"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <input
              type="text"
              placeholder="表示名"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "member" | "admin" }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            >
              <option value="member">メンバー</option>
              <option value="admin">管理者</option>
            </select>
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setAdding(false); setFormError(null); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="text-sm bg-brand-600 text-white px-4 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-40"
            >
              {saving ? "追加中..." : "追加する"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl px-4 py-2.5 hover:bg-gray-50 text-left"
        >
          + ユーザーを追加
        </button>
      )}
    </div>
  );
}
