"use client";

import { useEffect, useMemo, useState } from "react";

type ApiFaq = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  question: string;
  answer: {
    conclusion: string;
    evidence: string;
    supplement?: string;
    caution?: string;
    contact: string;
    sources: { title: string; section?: string }[];
  };
  askedCount: number;
  isPublished: boolean;
};

type SortMode = "category" | "ranking";

type Props = {
  onAsk: (question: string) => void;
};

export function FaqView({ onAsk }: Props) {
  const [faqs, setFaqs] = useState<ApiFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("category");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => r.json())
      .then((data: { items?: ApiFaq[] }) => setFaqs(data.items ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of faqs) {
      if (f.categoryId && f.categoryName) map.set(f.categoryId, f.categoryName);
    }
    return [...map.entries()];
  }, [faqs]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return faqs;
    return faqs.filter((f) => f.categoryId === activeCategory);
  }, [faqs, activeCategory]);

  const ranked = useMemo(() => [...faqs].sort((a, b) => b.askedCount - a.askedCount), [faqs]);

  const grouped = useMemo(() => {
    const map = new Map<string, ApiFaq[]>();
    map.set("__none__", []);
    for (const [id] of categories) map.set(id, []);
    for (const f of filtered) {
      const key = f.categoryId ?? "__none__";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return map;
  }, [filtered, categories]);

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-gray-400">読み込み中...</div>;

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">よくある質問</h1>
            <p className="mt-1 text-sm text-gray-600">
              カテゴリから探すか、よく聞かれる質問のランキングから探せます。
            </p>
          </div>
          <SortToggle mode={sortMode} onChange={setSortMode} />
        </div>

        {faqs.length === 0 ? (
          <p className="mt-8 text-sm text-gray-500">FAQが登録されていません。管理画面から追加してください。</p>
        ) : sortMode === "category" ? (
          <div className="mt-6">
            <div className="flex flex-wrap gap-2">
              <FilterChip label="すべて" active={activeCategory === "all"} onClick={() => setActiveCategory("all")} />
              {categories.map(([id, name]) => (
                <FilterChip key={id} label={name} active={activeCategory === id} onClick={() => setActiveCategory(id)} />
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-8">
              {categories.map(([id, name]) => {
                const items = grouped.get(id) ?? [];
                if (activeCategory !== "all" && activeCategory !== id) return null;
                if (items.length === 0) return null;
                return (
                  <section key={id}>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">{name}</h2>
                    <FaqList items={items} onAsk={onAsk} />
                  </section>
                );
              })}
              {(() => {
                const noCat = grouped.get("__none__") ?? [];
                if (noCat.length === 0 || (activeCategory !== "all" && activeCategory !== "__none__")) return null;
                return (
                  <section key="__none__">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">未分類</h2>
                    <FaqList items={noCat} onAsk={onAsk} />
                  </section>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">質問されたランキング</h2>
            <FaqList items={ranked} showRank onAsk={onAsk} />
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 " +
        (active ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-brand-50")
      }
    >
      {label}
    </button>
  );
}

function SortToggle({ mode, onChange }: { mode: SortMode; onChange: (m: SortMode) => void }) {
  return (
    <div role="group" aria-label="並び順" className="flex shrink-0 rounded-md border border-gray-300 bg-white p-0.5 text-xs">
      {(["category", "ranking"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={
            "rounded px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 " +
            (mode === m ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100")
          }
        >
          {m === "category" ? "カテゴリ別" : "ランキング"}
        </button>
      ))}
    </div>
  );
}

function FaqList({ items, showRank, onAsk }: { items: ApiFaq[]; showRank?: boolean; onAsk: (q: string) => void }) {
  if (items.length === 0) return <p className="text-sm text-gray-500">該当する質問はありません</p>;
  return (
    <ul className="flex flex-col divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {items.map((item, idx) => (
        <li key={item.id}>
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3 min-w-0">
                {showRank && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
                    {idx + 1}
                  </span>
                )}
                <span className="truncate text-gray-900">{item.question}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-gray-500">
                <span>{item.askedCount}回質問</span>
                <span className="transition-transform group-open:rotate-180">▾</span>
              </span>
            </summary>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
              <div className="text-sm text-gray-900">
                <span className="font-medium">結論:</span> {item.answer.conclusion}
              </div>
              {item.answer.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.answer.sources.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700">
                      {s.title}{s.section && <span className="text-gray-500">/ {s.section}</span>}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onAsk(item.question)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  この質問をチャットで開く
                </button>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
