import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockDb = {
  organization: { findFirst: vi.fn(), findUnique: vi.fn() },
  user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  userMembership: { findFirst: vi.fn() },
  passcode: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  authSession: { create: vi.fn() },
  authLockout: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
};

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/mailer", () => ({ sendPasscodeEmail: vi.fn() }));
vi.mock("@/lib/tokenSigning", () => ({
  signToken: vi.fn().mockResolvedValue("signed-token"),
  verifyToken: vi.fn(),
}));
vi.mock("@/lib/passcode", () => ({
  generateCode: vi.fn().mockReturnValue("123456"),
  hashCode: vi.fn().mockResolvedValue("mockedsalt:mockedhash"),
  verifyCode: vi.fn().mockResolvedValue(true), // 個別テストで上書き可
  passcodeExpiresAt: vi.fn().mockReturnValue(new Date(Date.now() + 600_000)),
  PASSCODE_TTL_SEC: 600,
}));
vi.mock("@/lib/session", () => ({
  createSessionRecord: vi.fn().mockResolvedValue({
    token: "signed-session-token",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }),
  SESSION_COOKIE_OPTIONS: { httpOnly: true, secure: true, sameSite: "lax" as const },
}));
vi.mock("@/lib/authShared", () => ({
  SESSION_COOKIE: "ob_session",
  ADMIN_SESSION_COOKIE: "ob_admin_session",
}));

// ─── TC-A002: 存在しないメールでも 200 ────────────────────────────────────────

describe("POST /api/auth/passcode/request", () => {
  beforeEach(() => vi.clearAllMocks());

  it("TC-A002: 存在しないメールアドレスでも 200 を返す（列挙攻撃防止）", async () => {
    mockDb.organization.findFirst.mockResolvedValue({
      id: "org_1",
      slug: "sprout",
      name: "Sprout",
    });
    mockDb.user.findUnique.mockResolvedValue(null);

    const { POST } = await import("@/app/api/auth/passcode/request/route");
    const req = new NextRequest("http://localhost/api/auth/passcode/request", {
      method: "POST",
      body: JSON.stringify({ email: "unknown@example.com", organizationSlug: "sprout" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ─── TC-A001〜TC-A006 ─────────────────────────────────────────────────────────

describe("POST /api/auth/passcode/verify", () => {
  beforeEach(() => vi.clearAllMocks());

  it("TC-A001: 正しいパスコードで 200 + ユーザー情報を返す", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org_1", slug: "sprout", name: "Sprout" });
    mockDb.authLockout.findUnique.mockResolvedValue(null);
    mockDb.passcode.findFirst.mockResolvedValue({
      id: "pc_1",
      codeHash: "validSalt:validHash",
      expiresAt: new Date(Date.now() + 300_000),
      verifiedAt: null,
    });
    mockDb.passcode.update.mockResolvedValue({});
    mockDb.user.findFirst.mockResolvedValue({
      id: "usr_1",
      email: "member@sprout.example.com",
      displayName: "田中 太郎",
      deletedAt: null,
      memberships: [{ id: "mem_1", role: "member", organizationId: "org_1", deletedAt: null }],
    });
    mockDb.user.update.mockResolvedValue({});

    const { POST } = await import("@/app/api/auth/passcode/verify/route");
    const req = new NextRequest("http://localhost/api/auth/passcode/verify", {
      method: "POST",
      body: JSON.stringify({ email: "member@sprout.example.com", organizationSlug: "sprout", passcode: "123456" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.email).toBe("member@sprout.example.com");
    expect(json.user.role).toBe("member");
    expect(json.organization.slug).toBe("sprout");
  });

  it("TC-A003: 誤ったパスコードで 401", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org_1", slug: "sprout" });
    mockDb.authLockout.findUnique.mockResolvedValue(null);
    // 一致するレコードなし → UNAUTHENTICATED
    mockDb.passcode.findFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/auth/passcode/verify/route");
    const req = new NextRequest("http://localhost/api/auth/passcode/verify", {
      method: "POST",
      body: JSON.stringify({ email: "member@sprout.example.com", organizationSlug: "sprout", passcode: "000000" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("TC-A004: 期限切れパスコードで 400 PASSCODE_EXPIRED", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org_1", slug: "sprout" });
    mockDb.authLockout.findUnique.mockResolvedValue(null);
    // コードは一致するが期限切れのレコードを返す
    mockDb.passcode.findFirst.mockResolvedValue({
      id: "pc_1",
      codeHash: "deadbeef:abcdef",
      expiresAt: new Date(Date.now() - 60_000), // 1分前（期限切れ）
      verifiedAt: null,
    });
    // verifyCode はデフォルトで true（module mock）

    const { POST } = await import("@/app/api/auth/passcode/verify/route");
    const req = new NextRequest("http://localhost/api/auth/passcode/verify", {
      method: "POST",
      body: JSON.stringify({ email: "member@sprout.example.com", organizationSlug: "sprout", passcode: "123456" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("PASSCODE_EXPIRED");
  });

  it("TC-A006: 5回失敗でロックアウト → 429", async () => {
    mockDb.organization.findFirst.mockResolvedValue({ id: "org_1", slug: "sprout" });
    mockDb.authLockout.findUnique.mockResolvedValue({
      id: "lk_1",
      email: "member@sprout.example.com",
      organizationId: "org_1",
      failedCount: 5,
      windowStartedAt: new Date(Date.now() - 1000),
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      updatedAt: new Date(),
    });

    const { POST } = await import("@/app/api/auth/passcode/verify/route");
    const req = new NextRequest("http://localhost/api/auth/passcode/verify", {
      method: "POST",
      body: JSON.stringify({ email: "member@sprout.example.com", organizationSlug: "sprout", passcode: "123456" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe("RATE_LIMITED");
  });
});
