"use client";

import { useEffect, useRef } from "react";
import type { ChatThread } from "@/types";
import { AnswerCard } from "./AnswerCard";
import { NoAnswerCard } from "./NoAnswerCard";
import { ChatInput } from "./ChatInput";
import { ThreadMemo } from "./ThreadMemo";

type Props = {
  thread: ChatThread;
  onSubmit: (question: string) => void;
  onFeedback: (turnId: string, value: "helpful" | "not-helpful") => void;
  onUpdateMemo: (memo: string) => void;
};

export function ChatView({
  thread,
  onSubmit,
  onFeedback,
  onUpdateMemo,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新しい turn が追加されたら末尾までスクロール。
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread.turns.length]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <ThreadMemo memo={thread.memo} onUpdateMemo={onUpdateMemo} />

          {thread.turns.map((turn, idx) => (
            <div key={turn.id} className="flex flex-col gap-4">
              <div className="rounded-2xl bg-brand-50 border border-brand-100 px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap">
                <div className="mb-1 text-xs font-medium text-brand-700">
                  {idx === 0 ? "あなたの質問" : "追加の質問"}
                </div>
                {turn.question}
              </div>

              {turn.result.kind === "not-found" ? (
                <NoAnswerCard
                  turn={turn}
                  relatedFaqIds={turn.result.relatedFaqIds}
                  onPickFaq={onSubmit}
                />
              ) : (
                <AnswerCard
                  turn={turn}
                  answer={turn.result.answer}
                  onFeedback={(v) => onFeedback(turn.id, v)}
                />
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSubmit={onSubmit} followup />
    </div>
  );
}
