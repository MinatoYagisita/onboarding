export const dynamic = "force-dynamic";
import { AdminShell } from "@/components/admin/AdminShell";
import { getDefaultOrg } from "@/lib/server-org";
import { db } from "@/lib/db";
import { UnansweredManager } from "@/components/admin/UnansweredManager";

export default async function AdminUnansweredPage() {
  const org = await getDefaultOrg();

  if (!org) {
    return (
      <AdminShell title="未回答一覧">
        <p className="text-sm text-gray-500">組織が見つかりません。</p>
      </AdminShell>
    );
  }

  const queries = await db.query.findMany({
    where: { organizationId: org.id, deletedAt: null, resultKind: "not_found" },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const grouped = new Map<string, { question: string; count: number; lastAskedAt: Date }>();
  for (const q of queries) {
    const key = q.question.trim().toLowerCase();
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      if (q.createdAt > existing.lastAskedAt) existing.lastAskedAt = q.createdAt;
    } else {
      grouped.set(key, { question: q.question, count: 1, lastAskedAt: q.createdAt });
    }
  }

  const items = [...grouped.values()]
    .sort((a, b) => b.count - a.count)
    .map((item) => ({ ...item, lastAskedAt: item.lastAskedAt.toISOString() }));

  return (
    <AdminShell
      title="未回答一覧"
      description="回答が見つからなかった質問の一覧。資料追加・FAQ登録の対象候補です。"
    >
      <UnansweredManager initialItems={items} />
    </AdminShell>
  );
}
