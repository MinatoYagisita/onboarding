import { db } from "./db";

export async function fetchRelatedFaqs(
  orgId: string,
  ids: string[],
): Promise<{ id: string; question: string }[]> {
  if (ids.length === 0) return [];
  const faqs = await db.faq.findMany({
    where: { id: { in: ids }, organizationId: orgId, deletedAt: null },
    select: { id: true, question: true },
  });
  return faqs.map((f) => ({ id: f.id, question: f.question }));
}
