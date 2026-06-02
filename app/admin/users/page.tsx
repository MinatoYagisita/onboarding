export const dynamic = "force-dynamic";
import { AdminShell } from "@/components/admin/AdminShell";
import { UserManager } from "@/components/admin/UserManager";

export default function AdminUsersPage() {
  return (
    <AdminShell
      title="ユーザー管理"
      description="この組織に所属するユーザーの一覧・追加・ロール変更・削除を行います。"
    >
      <div className="max-w-4xl">
        <UserManager />
      </div>
    </AdminShell>
  );
}
