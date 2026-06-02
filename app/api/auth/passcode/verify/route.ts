import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiHandler, validationError } from "@/lib/api";
import { verifyCode } from "@/lib/passcode";
import {
  createSessionRecord,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/session";
import { SESSION_COOKIE, ADMIN_SESSION_COOKIE } from "@/lib/authShared";

const MAX_FAILED = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1時間
const LOCKOUT_MS = 15 * 60 * 1000; // 15分

export const POST = withApiHandler(
  "POST /api/auth/passcode/verify",
  async (req: NextRequest) => {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const organizationSlug = String(body.organizationSlug ?? "").trim();
    const passcode = String(body.passcode ?? "").trim();
    const adminLogin = Boolean(body.adminLogin);

    const errors = [];
    if (!email) errors.push({ field: "email", message: "メールアドレスは必須です" });
    if (!organizationSlug) errors.push({ field: "organizationSlug", message: "organizationSlug は必須です" });
    if (!passcode) errors.push({ field: "passcode", message: "パスコードは必須です" });
    if (errors.length) return validationError(errors);

    const org = await db.organization.findFirst({
      where: { slug: organizationSlug, deletedAt: null },
    });
    if (!org) {
      return Response.json(
        { error: { code: "UNAUTHENTICATED", message: "メールアドレスまたはパスコードが正しくありません。" } },
        { status: 401 },
      );
    }

    // ロックアウト確認
    const lockout = await db.authLockout.findUnique({
      where: { email_organizationId: { email, organizationId: org.id } },
    });
    if (lockout?.lockedUntil && lockout.lockedUntil > new Date()) {
      const retryAfterSec = Math.ceil(
        (lockout.lockedUntil.getTime() - Date.now()) / 1000,
      );
      return Response.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "しばらく待ってから再試行してください",
            details: { retryAfterSec },
          },
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }

    // 未検証のパスコードを取得（期限は後で判定して PASSCODE_EXPIRED を返すため除外）
    const record = await db.passcode.findFirst({
      where: {
        email,
        organizationId: org.id,
        verifiedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      await incrementLockout(email, org.id, lockout);
      return Response.json(
        { error: { code: "UNAUTHENTICATED", message: "メールアドレスまたはパスコードが正しくありません。" } },
        { status: 401 },
      );
    }

    // コード検証（タイミングセーフ比較）
    const codeMatches = await verifyCode(passcode, record.codeHash);
    if (!codeMatches) {
      await incrementLockout(email, org.id, lockout);
      return Response.json(
        { error: { code: "UNAUTHENTICATED", message: "メールアドレスまたはパスコードが正しくありません。" } },
        { status: 401 },
      );
    }

    // コードは正しいが期限切れ
    if (record.expiresAt < new Date()) {
      return Response.json(
        { error: { code: "PASSCODE_EXPIRED", message: "パスコードの有効期限が切れています。再度送付してください。" } },
        { status: 400 },
      );
    }

    // 使用済みにする
    await db.passcode.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });

    // ロックアウトリセット
    if (lockout) {
      await db.authLockout.update({
        where: { id: lockout.id },
        data: { failedCount: 0, lockedUntil: null },
      });
    }

    // ユーザー + 所属確認
    const user = await db.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        memberships: {
          where: { organizationId: org.id, deletedAt: null },
        },
      },
    });
    if (!user || user.memberships.length === 0) {
      return Response.json(
        { error: { code: "FORBIDDEN", message: "この組織へのアクセス権がありません。" } },
        { status: 403 },
      );
    }

    const membership = user.memberships[0];
    if (adminLogin && membership.role !== "admin") {
      return Response.json(
        { error: { code: "FORBIDDEN", message: "管理者権限がありません。" } },
        { status: 403 },
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { token, expiresAt } = await createSessionRecord(user.id, org.id);
    const cookieName = adminLogin ? ADMIN_SESSION_COOKIE : SESSION_COOKIE;

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: membership.role,
        displayName: user.displayName,
      },
      organization: { id: org.id, slug: org.slug, name: org.name },
    });
    res.cookies.set(cookieName, token, {
      ...SESSION_COOKIE_OPTIONS,
      expires: expiresAt,
    });
    return res;
  },
);

async function incrementLockout(
  email: string,
  organizationId: string,
  current: { id: string; failedCount: number; windowStartedAt: Date } | null,
) {
  const now = new Date();

  if (!current || current.windowStartedAt.getTime() + WINDOW_MS < now.getTime()) {
    await db.authLockout.upsert({
      where: { email_organizationId: { email, organizationId } },
      update: { failedCount: 1, windowStartedAt: now, lockedUntil: null },
      create: { email, organizationId, failedCount: 1, windowStartedAt: now },
    });
  } else {
    const newCount = current.failedCount + 1;
    await db.authLockout.update({
      where: { id: current.id },
      data: {
        failedCount: newCount,
        lockedUntil:
          newCount >= MAX_FAILED
            ? new Date(now.getTime() + LOCKOUT_MS)
            : null,
      },
    });
  }
}
