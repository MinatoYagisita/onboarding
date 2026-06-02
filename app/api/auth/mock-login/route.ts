import { z } from "zod";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionRecord, SESSION_COOKIE_OPTIONS } from "@/lib/session";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/authShared";

const MOCK_ID = "admin";
const MOCK_PASSWORD = "Zaq12wsx";

const Schema = z.object({
  username: z.string(),
  password: z.string(),
  adminLogin: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (
    !parsed.success ||
    parsed.data.username !== MOCK_ID ||
    parsed.data.password !== MOCK_PASSWORD
  ) {
    return Response.json(
      { error: { code: "UNAUTHENTICATED", message: "IDまたはパスワードが正しくありません。" } },
      { status: 401 },
    );
  }

  const { adminLogin } = parsed.data;
  const orgSlug = process.env.DEFAULT_ORG_SLUG ?? "sprout";

  const org = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: "組織が見つかりません。DEFAULT_ORG_SLUG を確認してください。" } },
      { status: 404 },
    );
  }

  const role = adminLogin ? "admin" : "member";
  const membership = await db.userMembership.findFirst({
    where: { organizationId: org.id, role, deletedAt: null },
    include: { user: true },
  });
  if (!membership) {
    return Response.json(
      { error: { code: "NOT_FOUND", message: `${role} ロールのユーザーが見つかりません。db:seed を実行してください。` } },
      { status: 404 },
    );
  }

  const { token, expiresAt } = await createSessionRecord(membership.userId, org.id);
  const cookieName = adminLogin ? ADMIN_SESSION_COOKIE : SESSION_COOKIE;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName, token, { ...SESSION_COOKIE_OPTIONS, expires: expiresAt });
  return res;
}
