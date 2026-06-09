"use client";

import { useState, useEffect, useCallback } from "react";

type Channel = {
  id: string;
  type: "slack" | "email" | "teams";
  destination: string;
  enabled: boolean;
};

type DraftChannel = {
  type: "slack" | "email" | "teams";
  destination: string;
  enabled: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  slack: "Slack Webhook",
  email: "メールアドレス",
  teams: "Microsoft Teams Webhook",
};

const TYPE_PLACEHOLDERS: Record<string, string> = {
  slack: "https://hooks.slack.com/services/...",
  email: "admin@example.com",
  teams: "https://outlook.office.com/webhook/...",
};

const EMPTY_DRAFT: DraftChannel = { type: "slack", destination: "", enabled: true };

export function NotificationSettings() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [draft, setDraft] = useState<DraftChannel>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/notifications");
    if (!res.ok) return;
    const json = await res.json();
    setChannels(json.channels);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(updated: DraftChannel[]) {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const res = await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels: updated }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("保存に失敗しました。");
    } else {
      setSuccess(true);
      await load();
      setTimeout(() => setSuccess(false), 2000);
    }
  }

  function handleToggle(id: string) {
    const updated = channels.map((ch) =>
      ch.id === id ? { ...ch, enabled: !ch.enabled } : ch,
    );
    setChannels(updated);
    save(updated.map(({ type, destination, enabled }) => ({ type, destination, enabled })));
  }

  function handleDelete(id: string) {
    const updated = channels.filter((ch) => ch.id !== id);
    setChannels(updated);
    save(updated.map(({ type, destination, enabled }) => ({ type, destination, enabled })));
  }

  function handleAdd() {
    if (!draft.destination.trim()) return;
    const updated = [
      ...channels.map(({ type, destination, enabled }) => ({ type, destination, enabled })),
      { type: draft.type, destination: draft.destination.trim(), enabled: draft.enabled },
    ];
    save(updated);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  }

  if (loading) return <div className="text-sm text-gray-400">読み込み中...</div>;

  return (
    <div className="flex flex-col gap-4">
      {channels.length === 0 && !adding && (
        <p className="text-sm text-gray-400">通知チャネルが設定されていません。</p>
      )}

      {channels.map((ch) => (
        <div
          key={ch.id}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-500">{TYPE_LABELS[ch.type]}</div>
            <div className="truncate text-sm text-gray-800 mt-0.5">{ch.destination}</div>
          </div>
          <button
            onClick={() => handleToggle(ch.id)}
            className={`relative w-9 h-5 rounded-full overflow-hidden transition-colors flex-shrink-0 ${
              ch.enabled ? "bg-green-500" : "bg-gray-300"
            }`}
            aria-label={ch.enabled ? "無効にする" : "有効にする"}
          >
            <span
              className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                ch.enabled ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <button
            onClick={() => handleDelete(ch.id)}
            className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
          >
            削除
          </button>
        </div>
      ))}

      {adding ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <select
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as DraftChannel["type"] }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            >
              {Object.entries(TYPE_LABELS).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder={TYPE_PLACEHOLDERS[draft.type]}
              value={draft.destination}
              onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setAdding(false); setDraft(EMPTY_DRAFT); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={!draft.destination.trim() || saving}
              className="text-sm bg-brand-600 text-white px-4 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-40"
            >
              追加
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl px-4 py-2.5 hover:bg-gray-50 text-left"
        >
          + 通知チャネルを追加
        </button>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">保存しました。</p>}
      {saving && <p className="text-sm text-gray-400">保存中...</p>}
    </div>
  );
}
