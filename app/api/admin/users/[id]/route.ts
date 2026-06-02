import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { withParamsHandler, validationError, notFound } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";

const PatchSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  role: z.enum(["member", "admin"]).optional(),
});

export const PATCH = withParamsHandler<{ id: string }>(
  "PATCH /api/admin/users/:id",
  async (req: NextRequest, { id }) => {
    const session = await requireAdminSession(req);

    const membership = await db.userMembership.findFirst({
      where: { userId: id, organizationId: session.organizationId, deletedAt: null },
    });
    if (!membership) return notFound("ユーザーが見つかりません");

    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
      );
    }

    if (parsed.data.displayName !== undefined) {
      await db.user.update({
        where: { id },
        data: { displayName: parsed.data.displayName },
      });
    }
    if (parsed.data.role !== undefined) {
      await db.userMembership.update({
        where: { id: membership.id },
        data: { role: parsed.data.role },
      });
    }

    return Response.json({ ok: true });
  },
);

export const DELETE = withParamsHandler<{ id: string }>(
  "DELETE /api/admin/users/:id",
  async (req: NextRequest, { id }) => {
    const session = await requireAdminSession(req);

    // 自分自身は削除できない
    if (id === session.id) {
      return Response.json(
        { error: { code: "FORBIDDEN", message: "自分自身を削除することはできません。" } },
        { status: 403 },
      );
    }

    const membership = await db.userMembership.findFirst({
      where: { userId: id, organizationId: session.organizationId, deletedAt: null },
    });
    if (!membership) return notFound("ユーザーが見つかりません");

    await db.userMembership.update({
      where: { id: membership.id },
      data: { deletedAt: new Date() },
    });

    return new Response(null, { status: 204 });
  },
);
