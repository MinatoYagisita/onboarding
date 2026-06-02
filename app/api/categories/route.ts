import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg, validationError, notFound, withApiHandler } from "@/lib/api";

export const GET = withApiHandler("GET /api/categories", async (req) => {
  const org = await resolveOrg(req);
  if (!org) return notFound("組織が見つかりません");

  const categories = await db.category.findMany({
    where: { organizationId: org.id, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { faqs: { where: { deletedAt: null } } } } },
  });

  return Response.json({
    items: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      sortOrder: c.sortOrder,
      faqCount: c._count.faqs,
    })),
  });
});

const PostSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

export const POST = withApiHandler("POST /api/categories", async (req) => {
  const org = await resolveOrg(req);
  if (!org) return notFound("組織が見つかりません");

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })));
  }

  const maxOrder = await db.category.aggregate({
    where: { organizationId: org.id, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const category = await db.category.create({
    data: { organizationId: org.id, name: parsed.data.name, slug: parsed.data.slug, sortOrder },
  });

  return Response.json(
    { id: category.id, slug: category.slug, name: category.name, sortOrder: category.sortOrder, faqCount: 0 },
    { status: 201 }
  );
});
