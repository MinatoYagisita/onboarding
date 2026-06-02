import { NextResponse } from "next/server";
import { withApiHandler, validationError } from "@/lib/api";
import { finishAuthentication } from "@/lib/webauthn";
import { createSessionRecord, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { SESSION_COOKIE, ADMIN_SESSION_COOKIE } from "@/lib/authShared";
import { db } from "@/lib/db";

export const POST = withApiHandler(
  "POST /api/auth/webauthn/authenticate/verify",
  async (req) => {
    const body = await req.json().catch(() => null);
    if (!body) return validationError([{ field: "body", message: "認証応答が必要です" }]);

    const adminLogin = Boolean(body.adminLogin);

    const result = await finishAuthentication(body);
    if (!result.user || !result.organizationId) {
      return Response.json(
        { error: { code: "UNAUTHENTICATED", message: "認証に失敗しました。" } },
        { status: 401 },
      );
    }

    const membership = await db.userMembership.findFirst({
      where: { userId: result.user.id, organizationId: result.organizationId, deletedAt: null },
    });
    if (!membership) {
      return Response.json(
        { error: { code: "FORBIDDEN", message: "この組織へのアクセス権がありません。" } },
        { status: 403 },
      );
    }
    if (adminLogin && membership.role !== "admin") {
      return Response.json(
        { error: { code: "FORBIDDEN", message: "管理者権限がありません。" } },
        { status: 403 },
      );
    }

    await db.user.update({ where: { id: result.user.id }, data: { lastLoginAt: new Date() } });

    const { token, expiresAt } = await createSessionRecord(result.user.id, result.organizationId);
    const cookieName = adminLogin ? ADMIN_SESSION_COOKIE : SESSION_COOKIE;

    const res = NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
      },
    });
    res.cookies.set(cookieName, token, { ...SESSION_COOKIE_OPTIONS, expires: expiresAt });
    return res;
  },
);
