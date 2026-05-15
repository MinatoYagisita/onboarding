"use client";

import { useMemo, useState } from "react";
import type { FaqCategory, FaqItem } from "@/types";
import { FAQ_CATEGORY_LABELS } from "@/types";
import { FAQ_ITEMS } from "@/lib/mockData";
import { ChatInput } from "./ChatInput";
import { OrgLogo } from "./OrgLogo";
import { useOrg } from "./OrgProvider";

type Props = {
  onSubmit: (question: string) => void;
};

export function WelcomeView({ onSubmit }: Props) {
  const [inputValue, setInputValue] = useState("");
  const { profile } = useOrg();
  const hasDraft = inputValue.trim().length > 0;

  // よくある質問: 6カテゴリから代表1件ずつ
  const faqPicks = useMemo(() => pickOnePerCategory(FAQ_ITEMS), []);
  // ランキング: askedCount 上位5件
  const rankingPicks = useMemo(
    () => [...FAQ_ITEMS].sort((a, b) => b.askedCount - a.askedCount).slice(0, 5),
    [],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col items-center justify-center px-6 py-12">
        {/* Hero */}
        <div className="flex flex-col items-center gap-4 pt-8 text-center">
          <OrgLogo size={56} />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              {profile.welcomeHeroTitle}
            </h1>
            <p className="mt-3 text-sm text-gray-600">
              {profile.welcomeHeroDescription}
            </p>
          </div>
        </div>

        {/* 中央入力欄 */}
        <div className="mt-10 w-full">
          <ChatInput
            onSubmit={onSubmit}
            onValueChange={setInputValue}
            variant="hero"
            autoFocus
          />
        </div>

        {/* 入力し始めるまで表示 */}
        {!hasDraft && (
          <div className="mt-14 grid w-full gap-6 md:grid-cols-2">
            <SuggestionSection title="よくある質問">
              <div className="flex flex-col gap-2">
                {faqPicks.map((faq) => (
                  <SuggestionRow
                    key={faq.id}
                    label={FAQ_CATEGORY_LABELS[faq.category]}
                    question={faq.question}
                    onClick={() => onSubmit(faq.question)}
                  />
                ))}
              </div>
            </SuggestionSection>

            <SuggestionSection title="質問ランキング">
              <ol className="flex flex-col gap-2">
                {rankingPicks.map((faq, i) => (
                  <li key={faq.id}>
                    <RankRow
                      rank={i + 1}
                      question={faq.question}
                      askedCount={faq.askedCount}
                      onClick={() => onSubmit(faq.question)}
                    />
                  </li>
                ))}
              </ol>
            </SuggestionSection>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SuggestionRow({
  label,
  question,
  onClick,
}: {
  label: string;
  question: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col gap-0.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-brand-700">
        {label}
      </span>
      <span className="text-sm text-gray-900 group-hover:text-brand-900">
        {question}
      </span>
    </button>
  );
}

function RankRow({
  rank,
  question,
  askedCount,
  onClick,
}: {
  rank: number;
  question: string;
  askedCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      <span
        className={
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
          (rank <= 3
            ? "bg-brand-600 text-white"
            : "bg-gray-100 text-gray-600")
        }
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-gray-900">
        {question}
      </span>
      <span className="shrink-0 text-[10px] text-gray-500">
        {askedCount}回
      </span>
    </button>
  );
}

function pickOnePerCategory(items: FaqItem[]): FaqItem[] {
  const seen = new Set<FaqCategory>();
  const picks: FaqItem[] = [];
  // askedCount 降順で1件ずつ採用すると、各カテゴリの代表質問を取りやすい
  const sorted = [...items].sort((a, b) => b.askedCount - a.askedCount);
  for (const item of sorted) {
    if (seen.has(item.category)) continue;
    seen.add(item.category);
    picks.push(item);
  }
  return picks;
}
