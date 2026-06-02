export const dynamic = "force-dynamic";
import { AdminShell } from "@/components/admin/AdminShell";
import { getDefaultOrg } from "@/lib/server-org";
import { db } from "@/lib/db";
import { CategoryManager } from "@/components/admin/CategoryManager";

export default async function AdminCategoriesPage() {
  const org = await getDefaultOrg();

  if (!org) {
    return (
      <AdminShell title="カテゴリ">
        <p className="text-sm text-gray-500">組織が見つかりません。</p>
      </AdminShell>
    );
  }

  const categories = await db.category.findMany({
    where: { organizationId: org.id, deletedAt: null },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { faqs: { where: { deletedAt: null } } } } },
  });

  const initialCategories = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    sortOrder: c.sortOrder,
    faqCount: c._count.faqs,
  }));

  return (
    <AdminShell title="カテゴリ" description="FAQ・質問の分類に使うカテゴリを管理します。">
      <CategoryManager initialCategories={initialCategories} />
    </AdminShell>
  );
}
