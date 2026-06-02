import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { db } from "./db";
import { SESSION_COOKIE, ADMIN_SESSION_COOKIE } from "./authShared";
import { UnauthenticatedError, ForbiddenError } from "./errors";
import { signToken, verifyToken } from "./tokenSigning";

const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: "member" | "admin";
  organizationId: string;
  organizationSlug: string;
};

async function lookupSession(signedToken: string): Promise<SessionUser | null> {
  const raw = await verifyToken(signedToken);
  if (!raw) return null;

  const session = await db.authSession.findUnique({
    where: { sessionToken: raw },
    include: {
      user: {
        include: { memberships: { where: { deletedAt: null } } },
      },
      organization: { select: { id: true, slug: true } },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;

  const membership = session.user.memberships.find(
    (m) => m.organizationId === session.organizationId,
  );
  if (!membership) return null;

  return {
    id: session.userId,
    email: session.user.email,
    displayName: session.user.displayName,
    role: membership.role as "member" | "admin",
    organizationId: session.organizationId,
    organizationSlug: session.organization.slug,
  };
}

/** API Route Handler 用: NextRequest からセッションを取得 */
export async function getSessionFromRequest(
  req: NextRequest,
  isAdmin = false,
): Promise<SessionUser | null> {
  const token = req.cookies.get(isAdmin ? ADMIN_SESSION_COOKIE : SESSION_COOKIE)?.value;
  if (!token) return null;
  return lookupSession(token);
}

/** Server Component / Server Action 用: next/headers の cookies() から取得 */
export async function getSession(isAdmin = false): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(
    isAdmin ? ADMIN_SESSION_COOKIE : SESSION_COOKIE,
  )?.value;
  if (!token) return null;
  return lookupSession(token);
}

/** DB にセッションレコードを作成してトークンを返す（Cookie のセットは呼び出し側が行う） */
export async function createSessionRecord(
  userId: string,
  organizationId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const raw = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);
  await db.authSession.create({
    data: { userId, organizationId, sessionToken: raw, expiresAt },
  });
  // Cookie には署名付きトークンを格納する（proxy.ts がEdge で署名検証できるように）
  const signed = await signToken(raw);
  return { token: signed, expiresAt };
}

/** Server Action 用: cookies() でセッションを削除する */
export async function deleteSession(isAdmin = false): Promise<void> {
  const store = await cookies();
  const cookieName = isAdmin ? ADMIN_SESSION_COOKIE : SESSION_COOKIE;
  const signed = store.get(cookieName)?.value;
  if (signed) {
    const raw = await verifyToken(signed);
    if (raw) {
      await db.authSession.deleteMany({ where: { sessionToken: raw } });
    }
  }
  store.delete(cookieName);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SEC,
};

/** 認証必須ガード（未認証なら UnauthenticatedError をスロー） */
export async function requireSession(req: NextRequest): Promise<SessionUser> {
  const session = await getSessionFromRequest(req);
  if (!session) throw new UnauthenticatedError();
  return session;
}

/** 管理者必須ガード（未認証なら 401、member なら 403 をスロー） */
export async function requireAdminSession(
  req: NextRequest,
): Promise<SessionUser> {
  const session = await getSessionFromRequest(req, true);
  if (!session) throw new UnauthenticatedError();
  if (session.role !== "admin") throw new ForbiddenError("管理者権限が必要です");
  return session;
}
