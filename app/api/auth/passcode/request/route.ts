import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { withApiHandler, validationError } from "@/lib/api";
import { generateCode, hashCode, passcodeExpiresAt, PASSCODE_TTL_SEC } from "@/lib/passcode";
import { sendPasscodeEmail } from "@/lib/mailer";

const LOCKOUT_DURATION_MIN = 15;

export const POST = withApiHandler(
  "POST /api/auth/passcode/request",
  async (req: NextRequest) => {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const organizationSlug = String(body.organizationSlug ?? "").trim();

    const errors = [];
    if (!email) errors.push({ field: "email", message: "メールアドレスは必須です" });
    if (!organizationSlug) errors.push({ field: "organizationSlug", message: "organizationSlug は必須です" });
    if (errors.length) return validationError(errors);

    const org = await db.organization.findFirst({
      where: { slug: organizationSlug, deletedAt: null },
    });
    // 組織不存在でも 200 を返す（列挙攻撃防止）
    if (!org) return Response.json({ ok: true, expiresInSec: PASSCODE_TTL_SEC, _p: 1 });

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
            message: `${LOCKOUT_DURATION_MIN}分後に再試行してください`,
            details: { retryAfterSec },
          },
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }

    const code = generateCode();
    try {
      await db.passcode.create({
        data: {
          email,
          organizationId: org.id,
          codeHash: await hashCode(code),
          expiresAt: passcodeExpiresAt(),
        },
      });
    } catch (err) {
      // FK制約違反 = users に存在しないメール → 列挙攻撃防止のため200を返す
      if ((err as { code?: string }).code === "P2003") {
        return Response.json({ ok: true, expiresInSec: PASSCODE_TTL_SEC, _p: 2 });
      }
      throw err;
    }

    await sendPasscodeEmail(email, code, org.name);

    return Response.json({ ok: true, expiresInSec: PASSCODE_TTL_SEC, _p: 3 });
  },
);
