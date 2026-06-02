import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg, validationError, notFound, withApiHandler } from "@/lib/api";

export const GET = withApiHandler("GET /api/faqs", async (req) => {
  const org = await resolveOrg(req);
  if (!org) return notFound("組織が見つかりません");

  const url = req.nextUrl;
  const categoryId = url.searchParams.get("category");
  const sort = url.searchParams.get("sort") ?? "ranking";
  const adminAll = url.searchParams.get("adminAll") === "true";

  const faqs = await db.faq.findMany({
    where: {
      organizationId: org.id,
      deletedAt: null,
      ...(adminAll ? {} : { isPublished: true }),
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: sort === "ranking" ? { askedCount: "desc" } : { createdAt: "desc" },
    include: { category: true },
  });

  return Response.json({
    items: faqs.map((f) => ({
      id: f.id,
      categoryId: f.categoryId,
      categoryName: f.category?.name ?? null,
      question: f.question,
      answer: f.answer,
      askedCount: f.askedCount,
      isPublished: f.isPublished,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    })),
  });
});

const AnswerSchema = z.object({
  conclusion: z.string().min(1),
  evidence: z.string().min(1),
  supplement: z.string().optional(),
  caution: z.string().optional(),
  contact: z.string().min(1),
  sources: z.array(
    z.object({ title: z.string(), section: z.string().optional(), documentId: z.string().optional() })
  ),
});

const PostSchema = z.object({
  categoryId: z.string().nullable().optional(),
  question: z.string().min(1).max(500),
  answer: AnswerSchema,
  isPublished: z.boolean().default(false),
});

export const POST = withApiHandler("POST /api/faqs", async (req) => {
  const org = await resolveOrg(req);
  if (!org) return notFound("組織が見つかりません");

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })));
  }

  const faq = await db.faq.create({
    data: {
      organizationId: org.id,
      categoryId: parsed.data.categoryId ?? null,
      question: parsed.data.question,
      answer: parsed.data.answer as object,
      isPublished: parsed.data.isPublished,
    },
    include: { category: true },
  });

  return Response.json(
    {
      id: faq.id,
      categoryId: faq.categoryId,
      categoryName: faq.category?.name ?? null,
      question: faq.question,
      answer: faq.answer,
      askedCount: faq.askedCount,
      isPublished: faq.isPublished,
      createdAt: faq.createdAt.toISOString(),
      updatedAt: faq.updatedAt.toISOString(),
    },
    { status: 201 }
  );
});
