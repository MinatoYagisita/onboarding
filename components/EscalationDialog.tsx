"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  originalQuestion: string;
  contact: string;
  onClose: () => void;
};

type Stage = "compose" | "confirm" | "sent";

export function EscalationDialog({ originalQuestion, contact, onClose }: Props) {
  const [stage, setStage] = useState<Stage>("compose");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(originalQuestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 端末によって失敗する可能性があるため握りつぶす（モックのためログ表示は省略）
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="escalation-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
      >
        {stage === "compose" && (
          <div className="p-6">
            <h2
              id="escalation-title"
              className="text-base font-semibold text-gray-900"
            >
              担当者に質問を送る
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              回答が不十分な場合、管理者に直接確認できます。口調など調整して入力してください。
            </p>

            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-medium text-gray-500">
                  最初の質問
                </label>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs text-brand-700 hover:underline focus:outline-none"
                >
                  {copied ? "コピーしました" : "質問をコピー"}
                </button>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                {originalQuestion}
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="escalation-message"
                className="mb-1 block text-xs font-medium text-gray-500"
              >
                担当者宛メッセージ<span className="text-red-600 ml-0.5">*</span>
              </label>
              <textarea
                id="escalation-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="担当者への相談内容を入力してください"
                className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              />
            </div>

            <div className="mt-3 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-900">
              <span className="font-medium">担当窓口:</span> {contact}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                キャンセル
              </button>
              <button
                type="button"
                disabled={!message.trim()}
                onClick={() => setStage("confirm")}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                送信する
              </button>
            </div>
          </div>
        )}

        {stage === "confirm" && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-900">
              担当者に送付しますか？
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              送信すると担当者に通知が飛び、内容を確認できる状態になります。
            </p>
            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
              {message}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStage("compose")}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={() => setStage("sent")}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                この内容で送る
              </button>
            </div>
          </div>
        )}

        {stage === "sent" && (
          <div className="p-6">
            <h2 className="text-base font-semibold text-gray-900">
              担当者に送信しました
            </h2>
            <p className="mt-2 text-sm text-gray-700">
              返信があるまでお待ちください。履歴からも内容を確認できます。
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
