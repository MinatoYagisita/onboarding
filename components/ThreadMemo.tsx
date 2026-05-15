"use client";

import { useState } from "react";

type Props = {
  memo: string;
  onUpdateMemo: (memo: string) => void;
};

export function ThreadMemo({ memo, onUpdateMemo }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(memo);

  if (!editing) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">自分用メモ</span>
          <button
            type="button"
            onClick={() => {
              setDraft(memo);
              setEditing(true);
            }}
            className="text-xs text-brand-700 hover:underline focus:outline-none"
          >
            {memo ? "編集" : "追加"}
          </button>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {memo || (
            <span className="text-gray-400">メモは未入力です</span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="mb-2 text-xs font-medium text-gray-500">自分用メモ</div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder="例：次回の面談で質問する"
        className="w-full resize-none rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => {
            onUpdateMemo(draft.trim());
            setEditing(false);
          }}
          className="rounded-md bg-brand-600 px-3 py-1 text-xs text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          保存する
        </button>
      </div>
    </div>
  );
}
