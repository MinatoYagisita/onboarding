export type FaqCategory =
  | "first-day"
  | "attendance"
  | "dress-code"
  | "leave-break"
  | "store-rule"
  | "trouble";

export const FAQ_CATEGORY_LABELS: Record<FaqCategory, string> = {
  "first-day": "入社初日に多い質問",
  attendance: "勤怠・シフト",
  "dress-code": "服装・持ち物",
  "leave-break": "有給・休憩",
  "store-rule": "店舗ルール",
  trouble: "トラブル時",
};

export type Source = {
  title: string;
  section?: string;
};

export type Answer = {
  conclusion: string;
  evidence: string;
  supplement?: string;
  caution?: string;
  contact: string;
  sources: Source[];
};

export type EntryResult =
  | { kind: "answer"; answer: Answer }
  | { kind: "not-found"; relatedFaqIds: string[] };

export type FollowupItem = {
  /** 追加質問を検出するキーワード（部分一致）。最初にマッチしたものが採用される */
  keywords: string[];
  /** supported-questions.md に例として出す典型的な追加質問の文言 */
  question: string;
  /** 追加質問への回答 */
  answer: Answer;
};

export type FaqItem = {
  id: string;
  category: FaqCategory;
  question: string;
  answer: Answer;
  askedCount: number;
  /** 親 FAQ にぶら下がる追加質問のモック定義 */
  followups?: FollowupItem[];
};

/** 会話内の1発話（1 質問 + 1 回答）。 */
export type ChatTurn = {
  id: string;
  question: string;
  result: EntryResult;
  createdAt: number;
  feedback: "helpful" | "not-helpful" | null;
  /** この turn を解決した FAQ の id（null なら未ヒット、追加質問のマッチング補助に使う） */
  matchedFaqId: string | null;
};

/** 1 会話スレッド。親質問と追加質問を束ねる単位。 */
export type ChatThread = {
  id: string;
  turns: ChatTurn[];
  pinned: boolean;
  memo: string;
  createdAt: number;
};

export type ViewMode = "chat" | "faq";
