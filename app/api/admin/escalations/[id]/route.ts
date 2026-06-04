import { withParamsHandler, notFound } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";
import { db } from "@/lib/db";
import { EscalationStatus } from "@prisma/client";

export const PATCH = withParamsHandler<{ id: string }>(
  "PATCH /api/admin/escalations/:id",
  async (req, { id }) => {
    const session = await requireAdminSession(req);

    const escalation = await db.escalation.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!escalation) return notFound("相談が見つかりません");

    const body = await req.json().catch(() => ({}));
    const status = body.status as EscalationStatus;
    if (!["handled", "closed", "pending"].includes(status)) {
      return Response.json({ error: { code: "VALIDATION_ERROR", message: "不正なステータスです" } }, { status: 400 });
    }

    const updated = await db.escalation.update({
      where: { id },
      data: {
        status,
        handledAt: status === "handled" ? new Date() : status === "pending" ? null : undefined,
      },
    });

    return Response.json({ id: updated.id, status: updated.status });
  },
);
