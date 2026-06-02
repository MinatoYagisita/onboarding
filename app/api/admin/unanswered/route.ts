import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg, notFound, withApiHandler } from "@/lib/api";

export const GET = withApiHandler("GET /api/admin/unanswered", async (req: NextRequest) => {
  const org = await resolveOrg(req);
  if (!org) return notFound("組織が見つかりません");

  const url = new URL(req.url);
  const sort = url.searchParams.get("sort") ?? "frequency";

  const queries = await db.query.findMany({
    where: { organizationId: org.id, resultKind: "not_found", deletedAt: null },
    select: { question: true, createdAt: true },
  });

  const grouped = new Map<string, { count: number; lastAskedAt: Date }>();
  for (const q of queries) {
    const existing = grouped.get(q.question);
    if (!existing || q.createdAt > existing.lastAskedAt) {
      grouped.set(q.question, {
        count: (existing?.count ?? 0) + 1,
        lastAskedAt: q.createdAt,
      });
    } else {
      existing.count += 1;
    }
  }

  const items = Array.from(grouped.entries()).map(([question, { count, lastAskedAt }]) => ({
    question,
    count,
    lastAskedAt: lastAskedAt.toISOString(),
  }));

  if (sort === "frequency") {
    items.sort((a, b) => b.count - a.count);
  } else {
    items.sort((a, b) => new Date(b.lastAskedAt).getTime() - new Date(a.lastAskedAt).getTime());
  }

  return Response.json({ items });
});
