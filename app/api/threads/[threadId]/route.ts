import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validationError, notFound, withParamsHandler } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const GET = withParamsHandler<{ threadId: string }>(
  "GET /api/threads/:threadId",
  async (req, { threadId }) => {
    const session = await requireSession(req);

    const thread = await db.queryThread.findFirst({
      where: { id: threadId, organizationId: session.organizationId, userId: session.id, deletedAt: null },
      include: {
        queries: { where: { deletedAt: null }, orderBy: { turnIndex: "asc" } },
      },
    });
    if (!thread) return notFound("スレッドが見つかりません");

    return Response.json(formatThread(thread));
  }
);

const PatchSchema = z.object({
  pinned: z.boolean().optional(),
  memo: z.string().max(1000).optional(),
});

export const PATCH = withParamsHandler<{ threadId: string }>(
  "PATCH /api/threads/:threadId",
  async (req, { threadId }) => {
    const session = await requireSession(req);

    const thread = await db.queryThread.findFirst({
      where: { id: threadId, organizationId: session.organizationId, userId: session.id, deletedAt: null },
    });
    if (!thread) return notFound("スレッドが見つかりません");

    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })));
    }

    const updated = await db.queryThread.update({
      where: { id: threadId },
      data: parsed.data,
    });

    return Response.json({ id: updated.id, pinned: updated.pinned, memo: updated.memo });
  }
);

export const DELETE = withParamsHandler<{ threadId: string }>(
  "DELETE /api/threads/:threadId",
  async (req, { threadId }) => {
    const session = await requireSession(req);

    const thread = await db.queryThread.findFirst({
      where: { id: threadId, organizationId: session.organizationId, userId: session.id, deletedAt: null },
    });
    if (!thread) return notFound("スレッドが見つかりません");

    await db.queryThread.update({ where: { id: threadId }, data: { deletedAt: new Date() } });

    return new Response(null, { status: 204 });
  }
);

function formatThread(thread: {
  id: string;
  pinned: boolean;
  memo: string;
  createdAt: Date;
  updatedAt: Date;
  queries: Array<{
    id: string;
    question: string;
    turnIndex: number;
    resultKind: string;
    answer: unknown;
    relatedFaqIds: unknown;
    matchedFaqId: string | null;
    feedback: string | null;
    createdAt: Date;
  }>;
}) {
  return {
    id: thread.id,
    pinned: thread.pinned,
    memo: thread.memo,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    turns: thread.queries.map((q) => ({
      id: q.id,
      turnIndex: q.turnIndex,
      question: q.question,
      result:
        q.resultKind === "answer"
          ? { kind: "answer", answer: q.answer }
          : { kind: "not-found", relatedFaqIds: q.relatedFaqIds ?? [] },
      matchedFaqId: q.matchedFaqId,
      feedback: q.feedback,
      createdAt: q.createdAt.toISOString(),
    })),
  };
}
