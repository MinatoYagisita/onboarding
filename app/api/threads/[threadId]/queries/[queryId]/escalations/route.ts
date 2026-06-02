import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { validationError, notFound, withParamsHandler } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { notifyEscalation } from "@/lib/notify";

const PostSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const POST = withParamsHandler<{ threadId: string; queryId: string }>(
  "POST /api/threads/:threadId/queries/:queryId/escalations",
  async (req, { threadId, queryId }) => {
    const session = await requireSession(req);

    const query = await db.query.findFirst({
      where: { id: queryId, threadId, organizationId: session.organizationId, deletedAt: null },
    });
    if (!query) return notFound("質問が見つかりません");

    const body = await req.json().catch(() => null);
    const parsed = PostSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })));
    }

    const escalation = await db.escalation.create({
      data: {
        organizationId: session.organizationId,
        queryId,
        senderUserId: session.id,
        message: parsed.data.message,
        status: "pending",
      },
    });

    const org = await db.organization.findUnique({ where: { id: session.organizationId } });
    notifyEscalation(session.organizationId, {
      orgName: org?.name ?? session.organizationSlug,
      question: query.question,
      senderName: session.displayName,
      message: parsed.data.message,
    }).catch(() => {});

    return Response.json({ id: escalation.id, sentAt: escalation.sentAt.toISOString() }, { status: 201 });
  }
);
