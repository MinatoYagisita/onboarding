import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg, notFound, withParamsHandler } from "@/lib/api";
import { deleteFromS3 } from "@/lib/storage";

export const DELETE = withParamsHandler<{ id: string }>(
  "DELETE /api/documents/:id",
  async (req, { id }) => {
    const org = await resolveOrg(req);
    if (!org) return notFound("組織が見つかりません");

    const doc = await db.document.findFirst({ where: { id, organizationId: org.id, deletedAt: null } });
    if (!doc) return notFound("資料が見つかりません");

    await db.document.update({ where: { id }, data: { deletedAt: new Date() } });
    await deleteFromS3(doc.storageKey);
    return Response.json({ ok: true });
  }
);
