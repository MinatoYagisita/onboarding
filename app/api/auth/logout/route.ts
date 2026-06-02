import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withApiHandler } from "@/lib/api";
import { SESSION_COOKIE, ADMIN_SESSION_COOKIE } from "@/lib/authShared";

export const POST = withApiHandler(
  "POST /api/auth/logout",
  async (req: NextRequest) => {
    const adminToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const frontToken = req.cookies.get(SESSION_COOKIE)?.value;
    const token = adminToken ?? frontToken;

    if (token) {
      await db.authSession.deleteMany({ where: { sessionToken: token } });
    }

    const res = NextResponse.json({ ok: true });
    if (adminToken) res.cookies.delete(ADMIN_SESSION_COOKIE);
    if (frontToken) res.cookies.delete(SESSION_COOKIE);
    return res;
  },
);
