"use client";

import { useState } from "react";
import type { Answer, ChatTurn } from "@/types";
import { EscalationDialog } from "./EscalationDialog";

type Props = {
  turn: ChatTurn;
  answer: Answer;
  onFeedback: (value: "helpful" | "not-helpful") => void;
};

export function AnswerCard({ turn, answer, onFeedback }: Props) {
  const [escalationOpen, setEscalationOpen] = useState(false);

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <Section label="結論" tone="primary">
        <p className="text-gray-900 leading-relaxed">{answer.conclusion}</p>
      </Section>

      <Section label="根拠">
        <p className="text-gray-700 leading-relaxed">{answer.evidence}</p>
      </Section>

      {answer.supplement && (
        <Section label="補足">
          <p className="text-gray-700 leading-relaxed">{answer.supplement}</p>
        </Section>
      )}

      {answer.caution && (
        <Section label="注意点" tone="warning">
          <p className="text-gray-800 leading-relaxed">{answer.caution}</p>
        </Section>
      )}

      <Section label="相談先">
        <p className="text-gray-700 leading-relaxed">{answer.contact}</p>
      </Section>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <div className="text-xs font-medium text-gray-500 mb-2">出典</div>
        <ul className="flex flex-wrap gap-2">
          {answer.sources.map((s, i) => (
            <li
              key={i}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700"
            >
              <span className="font-medium">{s.title}</span>
              {s.section && <span className="text-gray-500">/ {s.section}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">この回答は役に立ちましたか？</span>
          <FeedbackButton
            active={turn.feedback === "helpful"}
            onClick={() => onFeedback("helpful")}
          >
            役に立った
          </FeedbackButton>
          <FeedbackButton
            active={turn.feedback === "not-helpful"}
            onClick={() => onFeedback("not-helpful")}
          >
            役に立たなかった
          </FeedbackButton>
          {turn.feedback && (
            <span className="text-xs text-gray-500">ご協力ありがとうございます</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEscalationOpen(true)}
          className="rounded-md border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          担当者に送る
        </button>
      </div>

      {escalationOpen && (
        <EscalationDialog
          originalQuestion={turn.question}
          contact={answer.contact}
          onClose={() => setEscalationOpen(false)}
        />
      )}
    </article>
  );
}

function Section({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: "primary" | "warning";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "primary"
      ? "border-l-brand-500"
      : tone === "warning"
        ? "border-l-amber-500"
        : "border-l-gray-300";
  return (
    <div className={`mb-5 border-l-2 pl-4 ${toneClass}`}>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      {children}
    </div>
  );
}

function FeedbackButton({
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
        "rounded-md border px-2.5 py-1 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 " +
        (active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50")
      }
    >
      {children}
    </button>
  );
}
