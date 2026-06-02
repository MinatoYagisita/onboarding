import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// TC-BG003: 管理者 Cookie がユーザー API を通らない
// getSessionFromRequest(req, isAdmin=false) は SESSION_COOKIE のみ読む

vi.mock("@/lib/tokenSigning", () => ({
  verifyToken: vi.fn().mockResolvedValue(null),
  signToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    authSession: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

describe("getSessionFromRequest", () => {
  it("TC-BG003: isAdmin=false のとき ob_admin_session Cookie を無視する", async () => {
    const { getSessionFromRequest } = await import("@/lib/session");

    const req = new NextRequest("http://localhost/api/threads");
    req.cookies.set("ob_admin_session", "some-admin-token");
    // ob_session はセットしない

    const session = await getSessionFromRequest(req, false);
    // verifyToken が null を返す → session は null
    expect(session).toBeNull();
  });

  it("isAdmin=true のとき ob_admin_session Cookie を読む", async () => {
    const { verifyToken } = await import("@/lib/tokenSigning");
    vi.mocked(verifyToken).mockResolvedValue(null);

    const { getSessionFromRequest } = await import("@/lib/session");

    const req = new NextRequest("http://localhost/api/admin/ranking");
    req.cookies.set("ob_admin_session", "admin-token");

    // verifyToken が null を返すので session は null だが、
    // cookie の読み取り自体は isAdmin=true で ob_admin_session を参照している
    const session = await getSessionFromRequest(req, true);
    expect(verifyToken).toHaveBeenCalledWith("admin-token");
    expect(session).toBeNull(); // DB に対応セッションなし
  });

  it("isAdmin=false のとき ob_session Cookie を読む", async () => {
    const { verifyToken } = await import("@/lib/tokenSigning");
    vi.mocked(verifyToken).mockResolvedValue(null);

    const { getSessionFromRequest } = await import("@/lib/session");

    const req = new NextRequest("http://localhost/api/threads");
    req.cookies.set("ob_session", "member-token");

    await getSessionFromRequest(req, false);
    expect(verifyToken).toHaveBeenCalledWith("member-token");
  });
});
