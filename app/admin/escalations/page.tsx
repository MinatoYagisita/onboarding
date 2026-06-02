export const dynamic = "force-dynamic";
import { AdminShell } from "@/components/admin/AdminShell";
import { getDefaultOrg } from "@/lib/server-org";
import { db } from "@/lib/db";
import { EscalationList } from "@/components/admin/EscalationList";

export default async function AdminEscalationsPage() {
  const org = await getDefaultOrg();

  if (!org) {
    return (
      <AdminShell title="相談一覧">
        <p className="text-sm text-gray-500">組織が見つかりません。</p>
      </AdminShell>
    );
  }

  const escalations = await db.escalation.findMany({
    where: { organizationId: org.id },
    orderBy: { sentAt: "desc" },
    take: 100,
    include: {
      query: { select: { question: true } },
      sender: { select: { displayName: true, email: true } },
    },
  });

  return (
    <AdminShell
      title="相談一覧"
      description="ユーザーが「担当者に送る」ボタンを押して送付した相談の一覧です。"
    >
      <EscalationList
        initialItems={escalations.map((e) => ({
          id: e.id,
          sentAt: e.sentAt.toISOString(),
          question: e.query.question,
          message: e.message,
          senderName: e.sender.displayName,
          status: e.status,
        }))}
      />
    </AdminShell>
  );
}
