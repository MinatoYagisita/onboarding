"use client";

import { useMemo, useState } from "react";
import type { FaqCategory, FaqItem } from "@/types";
import { FAQ_CATEGORY_LABELS } from "@/types";
import { FAQ_ITEMS } from "@/lib/mockData";

type SortMode = "category" | "ranking";

type Props = {
  onAsk: (question: string) => void;
};

export function FaqView({ onAsk }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("category");
  const [activeCategory, setActiveCategory] = useState<FaqCategory | "all">(
    "all",
  );

  const grouped = useMemo(() => groupByCategory(FAQ_ITEMS), []);
  const ranked = useMemo(
    () => [...FAQ_ITEMS].sort((a, b) => b.askedCount - a.askedCount),
    [],
  );

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              よくある質問
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              カテゴリから探すか、よく聞かれる質問のランキングから探せます。
            </p>
          </div>
          <SortToggle mode={sortMode} onChange={setSortMode} />
        </div>

        {sortMode === "category" ? (
          <div className="mt-6">
            <CategoryFilter
              active={activeCategory}
              onChange={setActiveCategory}
            />
            <div className="mt-6 flex flex-col gap-8">
              {(Object.keys(grouped) as FaqCategory[])
                .filter(
                  (cat) => activeCategory === "all" || cat === activeCategory,
                )
                .map((cat) => (
                  <section key={cat}>
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                      {FAQ_CATEGORY_LABELS[cat]}
                    </h2>
                    <FaqList items={grouped[cat]} onAsk={onAsk} />
                  </section>
                ))}
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              質問されたランキング
            </h2>
            <FaqList items={ranked} showRank onAsk={onAsk} />
          </div>
        )}
      </div>
    </div>
  );
}

function SortToggle({
  mode,
  onChange,
}: {
  mode: SortMode;
  onChange: (mode: SortMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="並び順"
      className="flex shrink-0 rounded-md border border-gray-300 bg-white p-0.5 text-xs"
    >
      <ToggleItem
        active={mode === "category"}
        onClick={() => onChange("category")}
      >
        カテゴリ別
      </ToggleItem>
      <ToggleItem
        active={mode === "ranking"}
        onClick={() => onChange("ranking")}
      >
        ランキング
      </ToggleItem>
    </div>
  );
}

function ToggleItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded px-3 py-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 " +
        (active ? "bg-brand-600 text-white" : "text-gray-700 hover:bg-gray-100")
      }
    >
      {children}
    </button>
  );
}

function CategoryFilter({
  active,
  onChange,
}: {
  active: FaqCategory | "all";
  onChange: (c: FaqCategory | "all") => void;
}) {
  const categories: (FaqCategory | "all")[] = [
    "all",
    "first-day",
    "attendance",
    "dress-code",
    "leave-break",
    "store-rule",
    "trouble",
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const isActive = active === cat;
        const label = cat === "all" ? "すべて" : FAQ_CATEGORY_LABELS[cat];
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={
              "rounded-full border px-3 py-1 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 " +
              (isActive
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-brand-50")
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function FaqList({
  items,
  showRank,
  onAsk,
}: {
  items: FaqItem[];
  showRank?: boolean;
  onAsk: (question: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">該当する質問はありません</p>;
  }
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
                <span className="transition-transform group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
              <div className="text-sm text-gray-900">
                <span className="font-medium">結論:</span> {item.answer.conclusion}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.answer.sources.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700"
                  >
                    {s.title}
                    {s.section && (
                      <span className="text-gray-500">/ {s.section}</span>
                    )}
                  </span>
                ))}
              </div>
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

function groupByCategory(items: FaqItem[]): Record<FaqCategory, FaqItem[]> {
  const result: Record<FaqCategory, FaqItem[]> = {
    "first-day": [],
    attendance: [],
    "dress-code": [],
    "leave-break": [],
    "store-rule": [],
    trouble: [],
  };
  for (const item of items) {
    result[item.category].push(item);
  }
  return result;
}
