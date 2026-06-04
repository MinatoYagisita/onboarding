import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { buildSystemPrompt, askClaude, AnswerInputSchema } from "@/lib/claude";
import { validationError, notFound, withParamsHandler } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { getOrgApiKey } from "@/lib/secrets";
import { notifyUnanswered } from "@/lib/notify";
import { fetchRelatedFaqs } from "@/lib/faq";

const PostSchema = z.object({
  question: z.string().min(1).max(1000),
});

export const POST = withParamsHandler<{ threadId: string }>(
  "POST /api/threads/:threadId/queries",
  async (req, { threadId }) => {
    const session = await requireSession(req);

    const thread = await db.queryThread.findFirst({
      where: { id: threadId, organizationId: session.organizationId, userId: session.id, deletedAt: null },
      include: { queries: { where: { deletedAt: null }, orderBy: { turnIndex: "asc" }, take: 10 } },
    });
    if (!thread) return notFound("スレッドが見つかりません");

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
    const history = thread.queries.map((q) => ({
      question: q.question,
      result:
        q.resultKind === "answer"
          ? { kind: "answer" as const, answer: AnswerInputSchema.parse(q.answer) }
          : { kind: "not-found" as const, relatedFaqIds: (q.relatedFaqIds as string[]) ?? [] },
    }));

    const orgApiKey = await getOrgApiKey(org.id);
    const systemPrompt = await buildSystemPrompt(org.id, orgName);
    const claudeResult = await askClaude(systemPrompt, question, history, orgApiKey);

    const turnIndex = thread.queries.length;
    const relatedFaqIds = claudeResult.kind === "not-found" ? claudeResult.relatedFaqIds : [];

    const query = await db.query.create({
      data: {
        threadId: thread.id,
        organizationId: org.id,
        userId: session.id,
        question,
        resultKind: claudeResult.kind === "answer" ? "answer" : "not_found",
        answer: claudeResult.kind === "answer" ? (claudeResult.answer as object) : undefined,
        relatedFaqIds: relatedFaqIds.length > 0 ? relatedFaqIds : undefined,
        matchedFaqId:
          claudeResult.kind === "answer" && claudeResult.answer.matchedFaqId
            ? claudeResult.answer.matchedFaqId
            : undefined,
        turnIndex,
      },
    });

    await db.queryThread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });

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
      { status: 201 }
    );
  }
);
