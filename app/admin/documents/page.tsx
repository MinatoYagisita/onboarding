export const dynamic = "force-dynamic";
import { AdminShell } from "@/components/admin/AdminShell";
import { getDefaultOrg } from "@/lib/server-org";
import { db } from "@/lib/db";
import { DocumentManager } from "@/components/admin/DocumentManager";

export default async function AdminDocumentsPage() {
  const org = await getDefaultOrg();

  if (!org) {
    return (
      <AdminShell title="資料管理">
        <p className="text-sm text-gray-500">組織が見つかりません。</p>
      </AdminShell>
    );
  }

  const docs = await db.document.findMany({
    where: { organizationId: org.id, deletedAt: null },
    orderBy: { uploadedAt: "desc" },
  });

  const initialDocuments = docs.map((d) => ({
    id: d.id,
    title: d.title,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    sourceType: d.sourceType,
    uploadedAt: d.uploadedAt.toISOString(),
  }));

  return (
    <AdminShell title="資料管理" description="AIが回答に使う資料（就業規則・マニュアルなど）をアップロードします。">
      <DocumentManager initialDocuments={initialDocuments} />
    </AdminShell>
  );
}
