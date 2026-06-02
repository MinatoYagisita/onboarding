import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg, notFound, validationError, withParamsHandler } from "@/lib/api";

const AnswerSchema = z.object({
  conclusion: z.string().min(1),
  evidence: z.string().min(1),
  supplement: z.string().optional(),
  caution: z.string().optional(),
  contact: z.string().min(1),
  sources: z.array(z.object({ title: z.string(), section: z.string().optional(), documentId: z.string().optional() })),
});

const PatchSchema = z.object({
  categoryId: z.string().nullable().optional(),
  question: z.string().min(1).max(500).optional(),
  answer: AnswerSchema.optional(),
  isPublished: z.boolean().optional(),
});

export const PATCH = withParamsHandler<{ id: string }>(
  "PATCH /api/faqs/:id",
  async (req, { id }) => {
    const org = await resolveOrg(req);
    if (!org) return notFound("組織が見つかりません");

    const faq = await db.faq.findFirst({ where: { id, organizationId: org.id, deletedAt: null } });
    if (!faq) return notFound("FAQが見つかりません");

    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })));
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.question !== undefined) updateData.question = data.question;
    if (data.answer !== undefined) updateData.answer = data.answer as object;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

    const updated = await db.faq.update({ where: { id }, data: updateData, include: { category: true } });

    return Response.json({
      id: updated.id,
      categoryId: updated.categoryId,
      categoryName: updated.category?.name ?? null,
      question: updated.question,
      answer: updated.answer,
      askedCount: updated.askedCount,
      isPublished: updated.isPublished,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  }
);

export const DELETE = withParamsHandler<{ id: string }>(
  "DELETE /api/faqs/:id",
  async (req, { id }) => {
    const org = await resolveOrg(req);
    if (!org) return notFound("組織が見つかりません");

    const faq = await db.faq.findFirst({ where: { id, organizationId: org.id, deletedAt: null } });
    if (!faq) return notFound("FAQが見つかりません");

    await db.faq.update({ where: { id }, data: { deletedAt: new Date() } });
    return Response.json({ ok: true });
  }
);
