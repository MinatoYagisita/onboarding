"use client";

import type { ChatTurn } from "@/types";
import { getFaqById } from "@/lib/mockData";

type Props = {
  turn: ChatTurn;
  relatedFaqIds: string[];
  onPickFaq: (faqQuestion: string) => void;
};

export function NoAnswerCard({ turn, relatedFaqIds, onPickFaq }: Props) {
  const faqs = relatedFaqIds
    .map((id) => getFaqById(id))
    .filter((f): f is NonNullable<typeof f> => !!f);

  return (
    <article className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h3 className="text-sm font-semibold text-amber-900">
        回答が見つかりませんでした
      </h3>
      <p className="mt-2 text-sm text-amber-900/90 leading-relaxed">
        該当する資料が管理画面に登録されていない可能性があります。担当者に直接相談するか、関連するFAQから探してみてください。
      </p>

      <div className="mt-4 text-xs text-amber-900/80">
        <span className="font-medium">送信した質問:</span> {turn.question}
      </div>

      {faqs.length > 0 && (
        <div className="mt-4 rounded-md bg-white p-4 border border-amber-100">
          <div className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            関連するよくある質問
          </div>
          <ul className="flex flex-col gap-1">
            {faqs.map((faq) => (
              <li key={faq.id}>
                <button
                  type="button"
                  onClick={() => onPickFaq(faq.question)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {faq.question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
