"use client";

import { useState } from "react";

type FaqAnswer = {
  conclusion: string;
  evidence: string;
  supplement?: string;
  caution?: string;
  contact: string;
  sources: { title: string; section?: string; documentId?: string }[];
};

type Faq = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  question: string;
  answer: FaqAnswer;
  askedCount: number;
  isPublished: boolean;
  createdAt: string;
};

type Category = { id: string; name: string };

const emptyAnswer = (): FaqAnswer => ({
  conclusion: "",
  evidence: "",
  supplement: "",
  caution: "",
  contact: "",
  sources: [],
});

export function FaqManager({
  initialFaqs,
  categories,
  initialQuestion = "",
}: {
  initialFaqs: Faq[];
  categories: Category[];
  initialQuestion?: string;
}) {
  const [faqs, setFaqs] = useState<Faq[]>(initialFaqs);
  const [mode, setMode] = useState<"list" | "add" | "edit">(initialQuestion ? "add" : "list");
  const [editing, setEditing] = useState<Faq | null>(null);
  const [draft, setDraft] = useState({ question: initialQuestion, categoryId: "", isPublished: false, answer: emptyAnswer() });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setDraft({ question: "", categoryId: "", isPublished: false, answer: emptyAnswer() });
    setEditing(null);
    setError(null);
    setMode("add");
  };

  const openEdit = (faq: Faq) => {
    setDraft({
      question: faq.question,
      categoryId: faq.categoryId ?? "",
      isPublished: faq.isPublished,
      answer: { ...emptyAnswer(), ...faq.answer },
    });
    setEditing(faq);
    setError(null);
    setMode("edit");
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const payload = {
      question: draft.question,
      categoryId: draft.categoryId || null,
      isPublished: draft.isPublished,
      answer: draft.answer,
    };
    try {
      if (mode === "add") {
        const res = await fetch("/api/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const j = await res.json(); setError(j.error?.message ?? "エラー"); return; }
        const created: Faq = await res.json();
        setFaqs((prev) => [created, ...prev]);
      } else if (editing) {
        const res = await fetch(`/api/faqs/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const j = await res.json(); setError(j.error?.message ?? "エラー"); return; }
        const updated: Faq = await res.json();
        setFaqs((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      }
      setMode("list");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (faq: Faq) => {
    const res = await fetch(`/api/faqs/${faq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !faq.isPublished }),
    });
    if (res.ok) {
      setFaqs((prev) => prev.map((f) => (f.id === faq.id ? { ...f, isPublished: !faq.isPublished } : f)));
    }
  };

  const handleDelete = async (faq: Faq) => {
    if (!confirm(`「${faq.question}」を削除しますか？`)) return;
    const res = await fetch(`/api/faqs/${faq.id}`, { method: "DELETE" });
    if (res.ok) setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
  };

  if (mode === "add" || mode === "edit") {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setMode("list")} className="text-sm text-gray-500 hover:text-gray-700">
            ← 戻る
          </button>
          <h2 className="text-sm font-semibold text-gray-900">{mode === "add" ? "FAQ追加" : "FAQ編集"}</h2>
        </div>

        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
          <FormField label="カテゴリ">
            <select
              value={draft.categoryId}
              onChange={(e) => setDraft((p) => ({ ...p, categoryId: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">カテゴリなし</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FormField>

          <FormField label="質問文" required>
            <textarea
              rows={2}
              value={draft.question}
              onChange={(e) => setDraft((p) => ({ ...p, question: e.target.value }))}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </FormField>

          <FormField label="結論（回答の要点）" required>
            <textarea rows={2} value={draft.answer.conclusion}
              onChange={(e) => setDraft((p) => ({ ...p, answer: { ...p.answer, conclusion: e.target.value } }))}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </FormField>

          <FormField label="根拠（規則・条文）" required>
            <textarea rows={2} value={draft.answer.evidence}
              onChange={(e) => setDraft((p) => ({ ...p, answer: { ...p.answer, evidence: e.target.value } }))}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </FormField>

          <FormField label="補足（任意）">
            <textarea rows={2} value={draft.answer.supplement ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, answer: { ...p.answer, supplement: e.target.value } }))}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </FormField>

          <FormField label="注意点（任意）">
            <textarea rows={2} value={draft.answer.caution ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, answer: { ...p.answer, caution: e.target.value } }))}
              className="w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </FormField>

          <FormField label="相談先" required>
            <input type="text" value={draft.answer.contact}
              onChange={(e) => setDraft((p) => ({ ...p, answer: { ...p.answer, contact: e.target.value } }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          </FormField>

          <div className="flex items-center gap-2">
            <input
              id="isPublished"
              type="checkbox"
              checked={draft.isPublished}
              onChange={(e) => setDraft((p) => ({ ...p, isPublished: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="isPublished" className="text-sm text-gray-700">公開する（ユーザーのFAQ一覧に表示）</label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => setMode("list")} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-gray-700">
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !draft.question || !draft.answer.conclusion || !draft.answer.evidence || !draft.answer.contact}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" onClick={openAdd} className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          ＋ FAQ追加
        </button>
      </div>

      {faqs.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-gray-500">
          FAQがありません。「＋ FAQ追加」から作成してください。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">質問</th>
                <th className="px-4 py-3 text-left font-medium">カテゴリ</th>
                <th className="px-4 py-3 text-left font-medium">状態</th>
                <th className="px-4 py-3 text-right font-medium">質問回数</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {faqs.map((faq) => (
                <tr key={faq.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{faq.question}</td>
                  <td className="px-4 py-3 text-gray-500">{faq.categoryName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(faq)}
                      className={
                        "rounded-full px-2 py-0.5 text-xs " +
                        (faq.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")
                      }
                    >
                      {faq.isPublished ? "公開" : "下書き"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{faq.askedCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => openEdit(faq)} className="text-xs text-gray-500 hover:text-gray-700">
                        編集
                      </button>
                      <button type="button" onClick={() => handleDelete(faq)} className="text-xs text-red-500 hover:text-red-700">
                        削除
                      </button>
                    </div>
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

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-700">
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
