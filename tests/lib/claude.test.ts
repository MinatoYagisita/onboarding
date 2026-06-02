import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AiUnavailableError } from "@/lib/errors";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFaqFindMany = vi.hoisted(() => vi.fn());
const mockDocFindMany = vi.hoisted(() => vi.fn());
const mockGroqCreate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({
  db: {
    faq: { findMany: mockFaqFindMany },
    document: { findMany: mockDocFindMany },
  },
}));

vi.mock("groq-sdk", () => ({
  // アロー関数は constructor として使えないため通常の function を使う
  default: vi.fn(function () {
    return { chat: { completions: { create: mockGroqCreate } } };
  }),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function () {
    return { messages: { create: vi.fn() } };
  }),
}));

// ─── buildSystemPrompt ────────────────────────────────────────────────────────

describe("buildSystemPrompt", () => {
  beforeEach(() => {
    mockFaqFindMany.mockReset();
    mockDocFindMany.mockReset();
  });

  it("TC-AI004: FAQ が存在する場合、FAQ セクションに質問が含まれる", async () => {
    mockFaqFindMany.mockResolvedValue([
      { id: "faq_1", question: "休憩は何分？", answer: { conclusion: "45分" } },
    ]);
    mockDocFindMany.mockResolvedValue([]);

    const { buildSystemPrompt } = await import("@/lib/claude");
    const prompt = await buildSystemPrompt("org_1", "TestOrg");

    expect(prompt).toContain("TestOrg");
    expect(prompt).toContain("FAQ一覧");
    expect(prompt).toContain("休憩は何分？");
  });

  it("TC-AI005: FAQ が0件の場合「登録されているFAQはありません」を含む", async () => {
    mockFaqFindMany.mockResolvedValue([]);
    mockDocFindMany.mockResolvedValue([]);

    const { buildSystemPrompt } = await import("@/lib/claude");
    const prompt = await buildSystemPrompt("org_1", "TestOrg");

    expect(prompt).toContain("登録されているFAQはありません");
  });

  it("TC-AI006: 資料が存在する場合、資料セクションにタイトルが含まれる", async () => {
    mockFaqFindMany.mockResolvedValue([]);
    mockDocFindMany.mockResolvedValue([
      { id: "doc_1", title: "就業規則.pdf", content: "第1条 勤務時間は8時間とする" },
    ]);

    const { buildSystemPrompt } = await import("@/lib/claude");
    const prompt = await buildSystemPrompt("org_1", "TestOrg");

    expect(prompt).toContain("就業規則.pdf");
    expect(prompt).toContain("第1条 勤務時間は8時間とする");
  });
});

// ─── askClaude ────────────────────────────────────────────────────────────────

const GROQ_KEY = { provider: "groq" as const, apiKey: "test-key" };

const successResponse = {
  choices: [
    {
      message: {
        tool_calls: [
          {
            function: {
              name: "answer",
              arguments: JSON.stringify({
                conclusion: "結論",
                evidence: "根拠",
                contact: "担当者",
                sources: [],
                matchedFaqId: null,
              }),
            },
          },
        ],
      },
    },
  ],
};

describe("askClaude", () => {
  beforeEach(() => {
    mockGroqCreate.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("TC-AI001: orgApiKey が null の場合 AiUnavailableError をスロー", async () => {
    const { askClaude } = await import("@/lib/claude");
    await expect(askClaude("system", "question", [], null)).rejects.toBeInstanceOf(
      AiUnavailableError,
    );
  });

  it("TC-AI002: Groq が3回連続失敗すると AiUnavailableError をスロー", async () => {
    mockGroqCreate.mockRejectedValue(new Error("API timeout"));

    const { askClaude } = await import("@/lib/claude");

    // タイマー実行中の一時的な unhandled rejection を防ぐため先に catch を付ける
    let caught: unknown;
    const promise = askClaude("system", "question", [], GROQ_KEY).catch((e) => {
      caught = e;
    });
    await vi.runAllTimersAsync();
    await promise;

    expect(caught).toBeInstanceOf(AiUnavailableError);
    expect(mockGroqCreate).toHaveBeenCalledTimes(3);
  });

  it("TC-AI003: 1回失敗後にリトライして成功する", async () => {
    mockGroqCreate
      .mockRejectedValueOnce(new Error("temporary error"))
      .mockResolvedValueOnce(successResponse);

    const { askClaude } = await import("@/lib/claude");
    const promise = askClaude("system", "question", [], GROQ_KEY);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.kind).toBe("answer");
    if (result.kind === "answer") {
      expect(result.answer.conclusion).toBe("結論");
    }
    expect(mockGroqCreate).toHaveBeenCalledTimes(2);
  });

  it("TC-AI007: not_found ツール呼び出しで kind=not-found を返す", async () => {
    mockGroqCreate.mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: "not_found",
                  arguments: JSON.stringify({ relatedFaqIds: ["faq_1", "faq_2"] }),
                },
              },
            ],
          },
        },
      ],
    });

    const { askClaude } = await import("@/lib/claude");
    const promise = askClaude("system", "question", [], GROQ_KEY);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.kind).toBe("not-found");
    if (result.kind === "not-found") {
      expect(result.relatedFaqIds).toEqual(["faq_1", "faq_2"]);
    }
  });
});
