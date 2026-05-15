"use client";

import { useState } from "react";
import type { ChatThread, ChatTurn, ViewMode } from "@/types";
import { searchAnswer } from "@/lib/mockData";
import { Sidebar } from "./Sidebar";
import { ChatView } from "./ChatView";
import { FaqView } from "./FaqView";
import { WelcomeView } from "./WelcomeView";

export function AppShell() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const handleSubmit = (question: string) => {
    if (activeThread) {
      // 同じスレッドに追加質問として turn を足す。
      const search = searchAnswer(question, { currentThread: activeThread });
      const turn = createTurn(question, search);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThread.id
            ? { ...t, turns: [...t.turns, turn] }
            : t,
        ),
      );
      return;
    }

    // 新しいスレッドを開く。
    const search = searchAnswer(question);
    const turn = createTurn(question, search);
    const thread: ChatThread = {
      id: generateId("th"),
      turns: [turn],
      pinned: false,
      memo: "",
      createdAt: Date.now(),
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setViewMode("chat");
  };

  const handleFeedback = (
    turnId: string,
    value: "helpful" | "not-helpful",
  ) => {
    setThreads((prev) =>
      prev.map((t) => ({
        ...t,
        turns: t.turns.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                feedback: turn.feedback === value ? null : value,
              }
            : turn,
        ),
      })),
    );
  };

  const handleUpdateMemo = (threadId: string, memo: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, memo } : t)),
    );
  };

  const handleTogglePin = (threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, pinned: !t.pinned } : t)),
    );
  };

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setViewMode("chat");
  };

  const handleNewChat = () => {
    setActiveThreadId(null);
    setViewMode("chat");
  };

  const handleChangeView = (view: ViewMode) => {
    setViewMode(view);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-gray-900">
      <Sidebar
        threads={threads}
        activeThreadId={activeThreadId}
        viewMode={viewMode}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onTogglePin={handleTogglePin}
        onChangeView={handleChangeView}
      />
      <main className="flex flex-1 flex-col overflow-hidden">
        {viewMode === "chat" ? (
          activeThread ? (
            <ChatView
              thread={activeThread}
              onSubmit={handleSubmit}
              onFeedback={handleFeedback}
              onUpdateMemo={(memo) =>
                handleUpdateMemo(activeThread.id, memo)
              }
            />
          ) : (
            <WelcomeView onSubmit={handleSubmit} />
          )
        ) : (
          <FaqView onAsk={handleSubmit} />
        )}
      </main>
    </div>
  );
}

function createTurn(
  question: string,
  search: ReturnType<typeof searchAnswer>,
): ChatTurn {
  return {
    id: generateId("tn"),
    question,
    createdAt: Date.now(),
    feedback: null,
    matchedFaqId: search.kind === "hit" ? search.faqId : null,
    result:
      search.kind === "hit"
        ? { kind: "answer", answer: search.answer }
        : { kind: "not-found", relatedFaqIds: search.relatedFaqIds },
  };
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
