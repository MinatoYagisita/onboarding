import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { withApiHandler, validationError } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";

export const GET = withApiHandler(
  "GET /api/admin/users",
  async (req: NextRequest) => {
    const session = await requireAdminSession(req);

    const memberships = await db.userMembership.findMany({
      where: { organizationId: session.organizationId, deletedAt: null },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });

    return Response.json({
      items: memberships.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        displayName: m.user.displayName,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
        lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
      })),
    });
  },
);

const PostSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  role: z.enum(["member", "admin"]),
});

export const POST = withApiHandler(
  "POST /api/admin/users",
  async (req: NextRequest) => {
    const session = await requireAdminSession(req);

    const body = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
      );
    }

    const { email, displayName, role } = parsed.data;

    // 既存ユーザー確認
    let user = await db.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) {
      user = await db.user.create({ data: { email, displayName } });
    }

    // 既存の所属確認
    const existing = await db.userMembership.findFirst({
      where: { userId: user.id, organizationId: session.organizationId, deletedAt: null },
    });
    if (existing) {
      return Response.json(
        { error: { code: "CONFLICT", message: "このユーザーは既にこの組織に所属しています。" } },
        { status: 409 },
      );
    }

    await db.userMembership.create({
      data: { userId: user.id, organizationId: session.organizationId, role },
    });

    return Response.json(
      {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role,
      },
      { status: 201 },
    );
  },
);
