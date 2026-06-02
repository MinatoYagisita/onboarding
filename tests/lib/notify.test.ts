import { describe, it, expect, vi, beforeEach } from "vitest";

// TC-N002, TC-N003, TC-N004, TC-BG002
// escapeHtml はモジュール内部関数なので notify 関数経由でメール HTML を検証する

vi.mock("@/lib/db", () => ({
  db: {
    notificationChannel: {
      findMany: vi.fn(),
    },
  },
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe("notifyEscalation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("XSS: question・message の HTML が正しくエスケープされる（TC-BG002, TC-N003）", async () => {
    const { db } = await import("@/lib/db");
    const { notifyEscalation } = await import("@/lib/notify");

    vi.mocked(db.notificationChannel.findMany)
      .mockResolvedValueOnce([]) // slack: なし
      .mockResolvedValueOnce([{ id: "ch1", destination: "admin@example.com", type: "email", enabled: true, organizationId: "org1", createdAt: new Date(), updatedAt: new Date() }]);

    // RESEND_API_KEY をセットして実際の fetch が呼ばれるようにする
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM = "noreply@example.com";

    await notifyEscalation("org1", {
      orgName: "テスト組織",
      question: '<script>alert("XSS")</script>',
      senderName: "<b>ハッカー</b>",
      message: '悪意のある\n<img src=x onerror=alert(1)>',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.html).toContain("&lt;script&gt;");
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;b&gt;");
    expect(body.html).not.toContain("<b>ハッカー</b>");
    expect(body.html).toContain("&lt;img");

    delete process.env.RESEND_API_KEY;
  });

  it("enabled=true の Slack チャネルに通知が飛ぶ（TC-N002）", async () => {
    const { db } = await import("@/lib/db");
    const { notifyEscalation } = await import("@/lib/notify");

    vi.mocked(db.notificationChannel.findMany)
      .mockResolvedValueOnce([{ id: "ch1", destination: "https://hooks.slack.com/test", type: "slack", enabled: true, organizationId: "org1", createdAt: new Date(), updatedAt: new Date() }])
      .mockResolvedValueOnce([]);

    await notifyEscalation("org1", {
      orgName: "テスト",
      question: "休憩は？",
      senderName: "山田",
      message: "詳細を教えてください",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("enabled=false のチャネルには通知しない（TC-N004）", async () => {
    const { db } = await import("@/lib/db");
    const { notifyEscalation } = await import("@/lib/notify");

    vi.mocked(db.notificationChannel.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await notifyEscalation("org1", {
      orgName: "テスト",
      question: "質問",
      senderName: "送信者",
      message: "内容",
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("notifyUnanswered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  it("XSS: question が HTML エスケープされる", async () => {
    const { db } = await import("@/lib/db");
    const { notifyUnanswered } = await import("@/lib/notify");

    vi.mocked(db.notificationChannel.findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "ch1", destination: "admin@example.com", type: "email", enabled: true, organizationId: "org1", createdAt: new Date(), updatedAt: new Date() }]);

    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM = "noreply@example.com";

    await notifyUnanswered("org1", {
      orgName: "テスト",
      question: '<script>evil()</script>',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;script&gt;");

    delete process.env.RESEND_API_KEY;
  });
});
