"use client";

import { useEffect, useRef, useState } from "react";

type Variant = "inline" | "hero";

type Props = {
  onSubmit: (question: string) => void;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  variant?: Variant;
  autoFocus?: boolean;
  /** 追加質問モード。プレースホルダーなどが変わる */
  followup?: boolean;
};

const PLACEHOLDER_DEFAULT = "休憩は何分取れますか？";
const PLACEHOLDER_FOLLOWUP = "追加で聞きたいこと（例: 分割して取得できますか？）";

export function ChatInput({
  onSubmit,
  onValueChange,
  disabled,
  variant = "inline",
  autoFocus,
  followup,
}: Props) {
  const placeholder = followup ? PLACEHOLDER_FOLLOWUP : PLACEHOLDER_DEFAULT;
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, variant === "hero" ? 320 : 240)}px`;
  }, [value, variant]);

  useEffect(() => {
    onValueChange?.(value);
  }, [value, onValueChange]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  const isHero = variant === "hero";

  const wrapperClass = isHero
    ? "w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_24px_-12px_rgba(101,163,13,0.25)] focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15"
    : "rounded-xl border border-gray-200 bg-white p-3 shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15";

  const textareaClass = isHero
    ? "flex-1 resize-none bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[24px]"
    : "flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

  const submitButtonClass = isHero
    ? "shrink-0 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-gray-300"
    : "shrink-0 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-gray-300";

  const containerClass = isHero
    ? "w-full"
    : "border-t border-gray-200 bg-white px-6 py-4";

  const innerClass = isHero ? "" : "mx-auto max-w-3xl";

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        <div className={`flex items-end gap-3 ${wrapperClass}`}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              // Cmd+Enter (mac) / Ctrl+Enter (win/linux) で送信。Enter 単体は改行。
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={isHero ? 2 : 1}
            placeholder={placeholder}
            disabled={disabled}
            aria-label="質問を入力"
            autoFocus={autoFocus}
            className={textareaClass}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className={submitButtonClass}
          >
            送信
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Enter で改行 /{" "}
          <kbd className="rounded border border-gray-300 bg-gray-50 px-1 font-mono text-[10px]">
            ⌘
          </kbd>
          <span className="mx-1">+</span>
          <kbd className="rounded border border-gray-300 bg-gray-50 px-1 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          で送信
        </p>
      </div>
    </div>
  );
}
