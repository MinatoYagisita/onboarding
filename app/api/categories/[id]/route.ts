import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg, notFound, validationError, withParamsHandler } from "@/lib/api";

const PatchSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
});

export const PATCH = withParamsHandler<{ id: string }>(
  "PATCH /api/categories/:id",
  async (req, { id }) => {
    const org = await resolveOrg(req);
    if (!org) return notFound("組織が見つかりません");

    const category = await db.category.findFirst({ where: { id, organizationId: org.id, deletedAt: null } });
    if (!category) return notFound("カテゴリが見つかりません");

    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })));
    }

    const updated = await db.category.update({ where: { id }, data: parsed.data });
    return Response.json({ id: updated.id, slug: updated.slug, name: updated.name, sortOrder: updated.sortOrder });
  }
);

export const DELETE = withParamsHandler<{ id: string }>(
  "DELETE /api/categories/:id",
  async (req, { id }) => {
    const org = await resolveOrg(req);
    if (!org) return notFound("組織が見つかりません");

    const category = await db.category.findFirst({ where: { id, organizationId: org.id, deletedAt: null } });
    if (!category) return notFound("カテゴリが見つかりません");

    await db.category.update({ where: { id }, data: { deletedAt: new Date() } });
    return Response.json({ ok: true });
  }
);
