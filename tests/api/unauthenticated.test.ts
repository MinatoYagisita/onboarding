import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { UnauthenticatedError } from "@/lib/errors";

// TC-S001: 未認証で API にアクセスすると 401

vi.mock("@/lib/session", () => ({
  requireSession: vi.fn().mockRejectedValue(new UnauthenticatedError()),
  requireAdminSession: vi.fn().mockRejectedValue(new UnauthenticatedError()),
  getSessionFromRequest: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db", () => ({ db: {} }));

describe("未認証アクセス", () => {
  it("TC-S001: Cookie なしで GET /api/threads → 401 UNAUTHENTICATED", async () => {
    const { GET } = await import("@/app/api/threads/route");
    const req = new NextRequest("http://localhost/api/threads");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });

  it("TC-S002: member Cookie で GET /api/admin/ranking → 403 FORBIDDEN", async () => {
    const { ForbiddenError } = await import("@/lib/errors");
    const { requireAdminSession } = await import("@/lib/session");
    vi.mocked(requireAdminSession).mockRejectedValue(new ForbiddenError("管理者権限が必要です"));

    const { GET } = await import("@/app/api/admin/ranking/route");
    const req = new NextRequest("http://localhost/api/admin/ranking");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });
});
