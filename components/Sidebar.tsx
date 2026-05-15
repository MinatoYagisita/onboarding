"use client";

import Link from "next/link";
import type { ChatThread, ViewMode } from "@/types";
import { OrgLogo } from "./OrgLogo";
import { LogoutButton } from "./LogoutButton";
import { PoweredBy } from "./PoweredBy";
import { useOrg } from "./OrgProvider";

type Props = {
  threads: ChatThread[];
  activeThreadId: string | null;
  viewMode: ViewMode;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  onTogglePin: (id: string) => void;
  onChangeView: (view: ViewMode) => void;
};

export function Sidebar({
  threads,
  activeThreadId,
  viewMode,
  onSelectThread,
  onNewChat,
  onTogglePin,
  onChangeView,
}: Props) {
  const { profile } = useOrg();
  const pinned = threads.filter((t) => t.pinned);
  const unpinned = threads.filter((t) => !t.pinned);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-gray-200 bg-[#f7f8f5]">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-200">
        <OrgLogo size={28} />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-gray-900">
            {profile.orgName}
          </span>
          <span className="text-[10px] text-gray-500">
            {profile.productSubtitle}
          </span>
        </div>
      </div>

      <nav className="flex gap-1 px-3 pt-3">
        <TabButton
          active={viewMode === "chat"}
          onClick={() => onChangeView("chat")}
        >
          {profile.askTabLabel}
        </TabButton>
        <TabButton
          active={viewMode === "faq"}
          onClick={() => onChangeView("faq")}
        >
          {profile.faqTabLabel}
        </TabButton>
      </nav>

      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={onNewChat}
          className="w-full rounded-md border border-brand-200 bg-white px-3 py-2 text-sm text-brand-700 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          ＋ 新しい質問
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 pt-4">
        {pinned.length > 0 && (
          <Section title="ピン留め">
            {pinned.map((thread) => (
              <HistoryItem
                key={thread.id}
                thread={thread}
                active={thread.id === activeThreadId && viewMode === "chat"}
                onSelect={() => onSelectThread(thread.id)}
                onTogglePin={() => onTogglePin(thread.id)}
              />
            ))}
          </Section>
        )}

        <Section title="過去の質問">
          {unpinned.length === 0 ? (
            <p className="px-2 py-3 text-xs text-gray-500">
              まだ質問はありません
            </p>
          ) : (
            unpinned.map((thread) => (
              <HistoryItem
                key={thread.id}
                thread={thread}
                active={thread.id === activeThreadId && viewMode === "chat"}
                onSelect={() => onSelectThread(thread.id)}
                onTogglePin={() => onTogglePin(thread.id)}
              />
            ))
          )}
        </Section>
      </div>

      <div className="flex items-center gap-2 border-t border-gray-200 px-2 py-2">
        <div className="flex-1">
          <LogoutButton />
        </div>
        <Link
          href="/admin"
          className="shrink-0 rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
          title="管理画面へ"
        >
          管理画面
        </Link>
      </div>
      <div className="border-t border-gray-200 py-2">
        <PoweredBy />
      </div>
    </aside>
  );
}

function TabButton({
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
        "flex-1 rounded-md px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 " +
        (active
          ? "bg-brand-600 text-white"
          : "text-gray-700 hover:bg-gray-200")
      }
    >
      {children}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function HistoryItem({
  thread,
  active,
  onSelect,
  onTogglePin,
}: {
  thread: ChatThread;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
}) {
  // スレッドのタイトルは最初の質問を採用。
  const title = thread.turns[0]?.question ?? "（質問なし）";
  const turnCount = thread.turns.length;

  return (
    <div
      className={
        "group flex items-start gap-1 rounded-md px-2 py-2 text-sm transition-colors " +
        (active ? "bg-brand-100" : "hover:bg-gray-100")
      }
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 min-w-0 text-left focus:outline-none"
        title={title}
      >
        <div className="flex items-center gap-1.5">
          <span className="truncate text-gray-900">{title}</span>
          {turnCount > 1 && (
            <span className="shrink-0 rounded bg-white px-1 py-0.5 text-[10px] font-medium text-brand-700 border border-brand-200">
              +{turnCount - 1}
            </span>
          )}
        </div>
        {thread.memo && (
          <div className="truncate text-xs text-gray-500 mt-0.5">
            メモ: {thread.memo}
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        aria-label={thread.pinned ? "ピンを外す" : "ピン留めする"}
        title={thread.pinned ? "ピンを外す" : "ピン留めする"}
        className={
          "shrink-0 rounded p-1 text-xs transition-opacity focus:outline-none focus:ring-2 focus:ring-brand-500 " +
          (thread.pinned
            ? "text-amber-600 opacity-100"
            : "text-gray-400 opacity-0 group-hover:opacity-100")
        }
      >
        {thread.pinned ? "★" : "☆"}
      </button>
    </div>
  );
}
