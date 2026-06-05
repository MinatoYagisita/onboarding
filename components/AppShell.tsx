"use client";

import { useCallback, useEffect, useState } from "react";
import type { Answer, ChatThread, ChatTurn, ViewMode } from "@/types";
import { Sidebar } from "./Sidebar";
import { ChatView } from "./ChatView";
import { FaqView } from "./FaqView";
import { WelcomeView } from "./WelcomeView";
import { useOrg } from "./OrgProvider";

// ─── API response shapes ─────────────────────────────────────────────────────

type ApiQuery = {
  id: string;
  turnIndex: number;
  question: string;
  result:
    | { kind: "answer"; answer: Answer }
    | { kind: "not-found"; relatedFaqs: { id: string; question: string }[] };
  matchedFaqId: string | null;
  feedback: "helpful" | "not-helpful" | null;
  createdAt: string;
};

type ApiThread = {
  id: string;
  pinned: boolean;
  memo: string;
  createdAt: string;
  updatedAt: string;
  turns: ApiQuery[];
};

// ─── Converters ──────────────────────────────────────────────────────────────

function apiQueryToChatTurn(q: ApiQuery): ChatTurn {
  return {
    id: q.id,
    question: q.question,
    createdAt: new Date(q.createdAt).getTime(),
    feedback: q.feedback,
    matchedFaqId: q.matchedFaqId,
    result: q.result as ChatTurn["result"],
  };
}

function apiThreadToChatThread(t: ApiThread): ChatThread {
  return {
    id: t.id,
    turns: t.turns.map(apiQueryToChatTurn),
    pinned: t.pinned,
    memo: t.memo,
    createdAt: new Date(t.createdAt).getTime(),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AppShell() {
  const { profile } = useOrg();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  useEffect(() => {
    type ListItem = { id: string; firstQuestion: string; pinned: boolean; memo: string; createdAt: string };
    fetch("/api/threads")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: ListItem[] }) => {
        setThreads(
          data.items.map((item) => ({
            id: item.id,
            turns: [],
            pinned: item.pinned,
            memo: item.memo,
            createdAt: new Date(item.createdAt).getTime(),
            firstQuestion: item.firstQuestion,
          }))
        );
      })
      .catch((err) => console.error("Failed to load threads", err));
  }, []);

  const handleSubmit = useCallback(
    async (question: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        if (activeThread) {
          const res = await fetch(`/api/threads/${activeThread.id}/queries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.error?.message ?? `エラーが発生しました（${res.status}）`);
          }
          const newQuery: ApiQuery = await res.json();
          const turn = apiQueryToChatTurn(newQuery);
          setThreads((prev) =>
            prev.map((t) =>
              t.id === activeThread.id
                ? { ...t, turns: [...t.turns, turn] }
                : t
            )
          );
        } else {
          const res = await fetch("/api/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(body?.error?.message ?? `エラーが発生しました（${res.status}）`);
          }
          const apiThread: ApiThread = await res.json();
          const thread = apiThreadToChatThread(apiThread);
          setThreads((prev) => [thread, ...prev]);
          setActiveThreadId(thread.id);
          setViewMode("chat");
        }
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "不明なエラーが発生しました");
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeThread, isSubmitting]
  );

  const handleFeedback = (
    turnId: string,
    value: "helpful" | "not-helpful"
  ) => {
    setThreads((prev) =>
      prev.map((t) => ({
        ...t,
        turns: t.turns.map((turn) =>
          turn.id === turnId
            ? { ...turn, feedback: turn.feedback === value ? null : value }
            : turn
        ),
      }))
    );
  };

  const handleUpdateMemo = async (threadId: string, memo: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, memo } : t))
    );
    await fetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo }),
    }).catch((err) => console.error("Failed to update memo", err));
  };

  const handleTogglePin = async (threadId: string) => {
    const thread = threads.find((t) => t.id === threadId);
    if (!thread) return;
    const newPinned = !thread.pinned;
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, pinned: newPinned } : t))
    );
    await fetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: newPinned }),
    }).catch((err) => console.error("Failed to toggle pin", err));
  };

  const handleSelectThread = async (threadId: string) => {
    const existing = threads.find((t) => t.id === threadId);
    if (existing && existing.turns.length === 0) {
      try {
        const res = await fetch(`/api/threads/${threadId}`);
        if (res.ok) {
          const apiThread: ApiThread = await res.json();
          const full = apiThreadToChatThread(apiThread);
          setThreads((prev) =>
            prev.map((t) => (t.id === threadId ? full : t))
          );
        }
      } catch (err) {
        console.error("Failed to load thread", err);
      }
    }
    setActiveThreadId(threadId);
    setViewMode("chat");
  };

  const handleDeleteThread = async (threadId: string) => {
    const res = await fetch(`/api/threads/${threadId}`, { method: "DELETE" });
    if (res.ok) {
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      if (activeThreadId === threadId) {
        setActiveThreadId(null);
        setViewMode("chat");
      }
    }
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
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        onTogglePin={handleTogglePin}
        onDeleteThread={handleDeleteThread}
        onChangeView={handleChangeView}
      />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* モバイル用トップバー */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100"
            aria-label="メニューを開く"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">{profile.orgName}</span>
        </div>

        {submitError && (
          <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            <span>{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="shrink-0 text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}
        {viewMode === "chat" ? (
          activeThread ? (
            <ChatView
              thread={activeThread}
              onSubmit={handleSubmit}
              onFeedback={handleFeedback}
              onUpdateMemo={(memo) => handleUpdateMemo(activeThread.id, memo)}
              isSubmitting={isSubmitting}
            />
          ) : (
            <WelcomeView onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          )
        ) : (
          <FaqView onAsk={handleSubmit} />
        )}
      </main>
    </div>
  );
}
