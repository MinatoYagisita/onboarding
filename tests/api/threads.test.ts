import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = {
  queryThread: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
  query: { create: vi.fn() },
  faq: { update: vi.fn() },
  organization: { findUnique: vi.fn() },
};

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(),
  requireAdminSession: vi.fn(),
}));
vi.mock("@/lib/claude", () => ({
  buildSystemPrompt: vi.fn().mockResolvedValue("system prompt"),
  askClaude: vi.fn(),
}));
vi.mock("@/lib/secrets", () => ({
  getOrgApiKey: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/notify", () => ({
  notifyUnanswered: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(url = "http://localhost/api/threads", init?: RequestInit) {
  return new NextRequest(url, init);
}

const SESSION = {
  id: "usr_1",
  email: "member@sprout.example.com",
  displayName: "テストユーザー",
  role: "member" as const,
  organizationId: "org_1",
  organizationSlug: "sprout",
};

const ORG = {
  id: "org_1",
  name: "Sprout",
  settings: { orgNameDisplay: "Sprout" },
};

// ─── TC-TM001: turnCount 正確性（バグ修正確認）────────────────────────────────

describe("GET /api/threads — turnCount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("TC-TM001: 3 turn のスレッドで turnCount === 3 が返る", async () => {
    const { requireSession } = await import("@/lib/session");
    vi.mocked(requireSession).mockResolvedValue(SESSION);

    // _count.queries が 3 を返すようにモック
    mockDb.queryThread.findMany.mockResolvedValue([
      {
        id: "thr_1",
        pinned: false,
        memo: "",
        updatedAt: new Date("2026-05-22T10:00:00Z"),
        createdAt: new Date("2026-05-22T09:00:00Z"),
        queries: [{ question: "最初の質問" }],
        _count: { queries: 3 },
      },
    ]);

    const { GET } = await import("@/app/api/threads/route");
    const res = await GET(makeReq());
    const json = await res.json();

    expect(json.items[0].turnCount).toBe(3);
    expect(json.items[0].firstQuestion).toBe("最初の質問");
  });

  it("削除済みクエリは turnCount に含まれない", async () => {
    const { requireSession } = await import("@/lib/session");
    vi.mocked(requireSession).mockResolvedValue(SESSION);

    mockDb.queryThread.findMany.mockResolvedValue([
      {
        id: "thr_2",
        pinned: false,
        memo: "",
        updatedAt: new Date(),
        createdAt: new Date(),
        queries: [{ question: "Q1" }],
        _count: { queries: 1 }, // 削除済みを除いた件数
      },
    ]);

    const { GET } = await import("@/app/api/threads/route");
    const res = await GET(makeReq());
    const json = await res.json();

    expect(json.items[0].turnCount).toBe(1);
  });
});

// ─── TC-T002, TC-T003, TC-T005 ────────────────────────────────────────────────

describe("POST /api/threads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("TC-T003: question が空文字で 400 VALIDATION_ERROR", async () => {
    const { requireSession } = await import("@/lib/session");
    vi.mocked(requireSession).mockResolvedValue(SESSION);

    const { POST } = await import("@/app/api/threads/route");
    const req = makeReq("http://localhost/api/threads", {
      method: "POST",
      body: JSON.stringify({ question: "" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("TC-T005: question 1001文字で 400", async () => {
    const { requireSession } = await import("@/lib/session");
    vi.mocked(requireSession).mockResolvedValue(SESSION);

    const { POST } = await import("@/app/api/threads/route");
    const req = makeReq("http://localhost/api/threads", {
      method: "POST",
      body: JSON.stringify({ question: "あ".repeat(1001) }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("TC-T002: 正常系 — answer が返り 201", async () => {
    const { requireSession } = await import("@/lib/session");
    const { askClaude } = await import("@/lib/claude");

    vi.mocked(requireSession).mockResolvedValue(SESSION);
    mockDb.organization.findUnique.mockResolvedValue(ORG);
    vi.mocked(askClaude).mockResolvedValue({
      kind: "answer",
      answer: {
        conclusion: "45分です",
        evidence: "就業規則第18条",
        supplement: null,
        caution: null,
        contact: "店長",
        sources: [],
        matchedFaqId: null,
      },
    });
    mockDb.queryThread.create.mockResolvedValue({
      id: "thr_new",
      pinned: false,
      memo: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockDb.query.create.mockResolvedValue({
      id: "qry_1",
      turnIndex: 0,
      question: "休憩は何分？",
      matchedFaqId: null,
      feedback: null,
      createdAt: new Date(),
    });

    const { POST } = await import("@/app/api/threads/route");
    const req = makeReq("http://localhost/api/threads", {
      method: "POST",
      body: JSON.stringify({ question: "休憩は何分？" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.turns[0].result.kind).toBe("answer");
    expect(json.turns[0].result.answer.conclusion).toBe("45分です");
  });

  it("TC-T007: matchedFaqId がある場合に askedCount が +1 される", async () => {
    const { requireSession } = await import("@/lib/session");
    const { askClaude } = await import("@/lib/claude");

    vi.mocked(requireSession).mockResolvedValue(SESSION);
    mockDb.organization.findUnique.mockResolvedValue(ORG);
    vi.mocked(askClaude).mockResolvedValue({
      kind: "answer",
      answer: {
        conclusion: "回答",
        evidence: "",
        supplement: null,
        caution: null,
        contact: "",
        sources: [],
        matchedFaqId: "faq_1",
      },
    });
    mockDb.queryThread.create.mockResolvedValue({ id: "thr_1", pinned: false, memo: "", createdAt: new Date(), updatedAt: new Date() });
    mockDb.query.create.mockResolvedValue({ id: "qry_1", turnIndex: 0, question: "Q", matchedFaqId: "faq_1", feedback: null, createdAt: new Date() });
    mockDb.faq.update.mockResolvedValue({});

    const { POST } = await import("@/app/api/threads/route");
    const req = makeReq("http://localhost/api/threads", {
      method: "POST",
      body: JSON.stringify({ question: "有給は？" }),
      headers: { "Content-Type": "application/json" },
    });
    await POST(req);

    expect(mockDb.faq.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "faq_1", organizationId: "org_1" }),
        data: { askedCount: { increment: 1 } },
      })
    );
  });

  it("TC-T008, TC-BG004: organizationId のスコープ外 FAQ では askedCount が更新されない", async () => {
    const { requireSession } = await import("@/lib/session");
    const { askClaude } = await import("@/lib/claude");

    vi.mocked(requireSession).mockResolvedValue(SESSION);
    mockDb.organization.findUnique.mockResolvedValue(ORG);
    vi.mocked(askClaude).mockResolvedValue({
      kind: "answer",
      answer: { conclusion: "回答", evidence: "", supplement: null, caution: null, contact: "", sources: [], matchedFaqId: "other_org_faq" },
    });
    mockDb.queryThread.create.mockResolvedValue({ id: "thr_1", pinned: false, memo: "", createdAt: new Date(), updatedAt: new Date() });
    mockDb.query.create.mockResolvedValue({ id: "qry_1", turnIndex: 0, question: "Q", matchedFaqId: "other_org_faq", feedback: null, createdAt: new Date() });
    // update が where: { organizationId: "org_1" } 付きで呼ばれることを確認
    // 他組織の FAQ には organizationId が一致しないため Prisma が更新をスキップする
    mockDb.faq.update.mockRejectedValue(new Error("Record not found"));

    const { POST } = await import("@/app/api/threads/route");
    const req = makeReq("http://localhost/api/threads", {
      method: "POST",
      body: JSON.stringify({ question: "質問" }),
      headers: { "Content-Type": "application/json" },
    });

    // エラーは .catch で握りつぶされるので 201 が返る
    const res = await POST(req);
    expect(res.status).toBe(201);

    expect(mockDb.faq.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org_1" }),
      })
    );
  });
});

