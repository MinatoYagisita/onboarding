import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockDb = {
  faq: { findMany: vi.fn() },
};

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/session", () => ({
  requireAdminSession: vi.fn(),
}));

const ADMIN_SESSION = {
  id: "usr_admin",
  email: "admin@sprout.example.com",
  displayName: "管理者",
  role: "admin" as const,
  organizationId: "org_1",
  organizationSlug: "sprout",
};

describe("GET /api/admin/ranking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("TC-R001: askedCount 降順で返る", async () => {
    const { requireAdminSession } = await import("@/lib/session");
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    mockDb.faq.findMany.mockResolvedValue([
      { id: "faq_b", question: "B", askedCount: 50, category: { name: "勤怠" }, isPublished: true },
      { id: "faq_a", question: "A", askedCount: 10, category: null, isPublished: true },
      { id: "faq_c", question: "C", askedCount: 5, category: null, isPublished: false },
    ]);

    const { GET } = await import("@/app/api/admin/ranking/route");
    const req = new NextRequest("http://localhost/api/admin/ranking");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items[0].count).toBe(50);
    expect(json.items[1].count).toBe(10);
    expect(json.items[2].count).toBe(5);
  });

  it("TC-R003: limit=200 を指定しても最大 100 件", async () => {
    const { requireAdminSession } = await import("@/lib/session");
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    mockDb.faq.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/admin/ranking/route");
    const req = new NextRequest("http://localhost/api/admin/ranking?limit=200");
    await GET(req);

    expect(mockDb.faq.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it("TC-S002: member ロールで 403", async () => {
    const { requireAdminSession } = await import("@/lib/session");
    vi.mocked(requireAdminSession).mockRejectedValue(
      new (await import("@/lib/errors")).ForbiddenError("管理者権限が必要です")
    );

    const { GET } = await import("@/app/api/admin/ranking/route");
    const req = new NextRequest("http://localhost/api/admin/ranking");
    const res = await GET(req);

    expect(res.status).toBe(403);
  });
});
