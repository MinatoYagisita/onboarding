export const dynamic = "force-dynamic";
import { AdminShell } from "@/components/admin/AdminShell";
import { getDefaultOrg } from "@/lib/server-org";
import { db } from "@/lib/db";
import { FaqManager } from "@/components/admin/FaqManager";

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const org = await getDefaultOrg();

  if (!org) {
    return (
      <AdminShell title="FAQ管理">
        <p className="text-sm text-gray-500">組織が見つかりません。</p>
      </AdminShell>
    );
  }

  const [faqs, categories] = await Promise.all([
    db.faq.findMany({
      where: { organizationId: org.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    }),
    db.category.findMany({
      where: { organizationId: org.id, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const initialFaqs = faqs.map((f) => ({
    id: f.id,
    categoryId: f.categoryId ?? null,
    categoryName: f.category?.name ?? null,
    question: f.question,
    answer: f.answer as {
      conclusion: string;
      evidence: string;
      supplement?: string;
      caution?: string;
      contact: string;
      sources: { title: string; section?: string; documentId?: string }[];
    },
    askedCount: f.askedCount,
    isPublished: f.isPublished,
    createdAt: f.createdAt.toISOString(),
  }));

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <AdminShell title="FAQ管理" description="ユーザーからよく聞かれる質問と回答を管理します。">
      <FaqManager initialFaqs={initialFaqs} categories={categoryOptions} initialQuestion={q ?? ""} />
    </AdminShell>
  );
}
