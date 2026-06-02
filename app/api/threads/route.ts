import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { buildSystemPrompt, askClaude } from "@/lib/claude";
import { validationError, notFound, withApiHandler } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { getOrgApiKey } from "@/lib/secrets";
import { notifyUnanswered } from "@/lib/notify";
import { fetchRelatedFaqs } from "@/lib/faq";

const PostSchema = z.object({
  question: z.string().min(1).max(1000),
});

export const POST = withApiHandler("POST /api/threads", async (req) => {
  const session = await requireSession(req);

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })));
  }
  const { question } = parsed.data;

  const org = await db.organization.findUnique({
    where: { id: session.organizationId },
    include: { settings: true },
  });
  if (!org) return notFound("組織が見つかりません");

  const orgName = org.settings?.orgNameDisplay ?? org.name;
  const orgApiKey = await getOrgApiKey(org.id);
  const systemPrompt = await buildSystemPrompt(org.id, orgName);
  const claudeResult = await askClaude(systemPrompt, question, [], orgApiKey);

  const thread = await db.queryThread.create({
    data: { organizationId: org.id, userId: session.id, pinned: false, memo: "" },
  });

  const relatedFaqIds = claudeResult.kind === "not-found" ? claudeResult.relatedFaqIds : [];

  const query = await db.query.create({
    data: {
      threadId: thread.id,
      organizationId: org.id,
      userId: session.id,
      question,
      resultKind: claudeResult.kind === "answer" ? "answer" : "not_found",
      answer: claudeResult.kind === "answer" ? (claudeResult.answer as Record<string, unknown>) : undefined,
      relatedFaqIds: relatedFaqIds.length > 0 ? relatedFaqIds : undefined,
      matchedFaqId:
        claudeResult.kind === "answer" && claudeResult.answer.matchedFaqId
          ? claudeResult.answer.matchedFaqId
          : undefined,
      turnIndex: 0,
    },
  });

  if (claudeResult.kind === "answer" && claudeResult.answer.matchedFaqId) {
    await db.faq
      .update({
        where: { id: claudeResult.answer.matchedFaqId, organizationId: org.id, deletedAt: null },
        data: { askedCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  if (claudeResult.kind === "not-found") {
    notifyUnanswered(org.id, { orgName, question }).catch(() => {});
  }

  const relatedFaqs = await fetchRelatedFaqs(org.id, relatedFaqIds);

  return Response.json(
    {
      id: thread.id,
      pinned: thread.pinned,
      memo: thread.memo,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      turns: [
        {
          id: query.id,
          turnIndex: query.turnIndex,
          question: query.question,
          result:
            claudeResult.kind === "answer"
              ? { kind: "answer", answer: claudeResult.answer }
              : { kind: "not-found", relatedFaqs },
          matchedFaqId: query.matchedFaqId,
          feedback: query.feedback,
          createdAt: query.createdAt.toISOString(),
        },
      ],
    },
    { status: 201 }
  );
});

export const GET = withApiHandler("GET /api/threads", async (req) => {
  const session = await requireSession(req);

  const url = req.nextUrl;
  const pinned = url.searchParams.get("pinned");
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);

  const threads = await db.queryThread.findMany({
    where: {
      organizationId: session.organizationId,
      userId: session.id,
      deletedAt: null,
      ...(pinned === "true" ? { pinned: true } : pinned === "false" ? { pinned: false } : {}),
      ...(cursor ? { updatedAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit + 1,
    include: {
      queries: { where: { deletedAt: null }, orderBy: { turnIndex: "asc" }, take: 1 },
      _count: { select: { queries: { where: { deletedAt: null } } } },
    },
  });

  const hasMore = threads.length > limit;
  const items = hasMore ? threads.slice(0, limit) : threads;

  return Response.json({
    items: items.map((t) => ({
      id: t.id,
      firstQuestion: t.queries[0]?.question ?? "",
      turnCount: t._count.queries,
      pinned: t.pinned,
      memo: t.memo,
      updatedAt: t.updatedAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? (items[items.length - 1]?.updatedAt.toISOString() ?? null) : null,
  });
});
