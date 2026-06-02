import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { withApiHandler, notFound } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";

export const GET = withApiHandler(
  "GET /api/admin/ranking",
  async (req: NextRequest) => {
    const session = await requireAdminSession(req);

    const url = req.nextUrl;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const faqs = await db.faq.findMany({
      where: {
        organizationId: session.organizationId,
        deletedAt: null,
        askedCount: { gt: 0 },
        ...(from || to
          ? {
              updatedAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { askedCount: "desc" },
      take: limit,
      select: {
        id: true,
        question: true,
        askedCount: true,
        category: { select: { name: true } },
        isPublished: true,
      },
    });

    return Response.json({
      items: faqs.map((f) => ({
        faqId: f.id,
        question: f.question,
        count: f.askedCount,
        category: f.category?.name ?? null,
        isPublished: f.isPublished,
      })),
    });
  },
);
