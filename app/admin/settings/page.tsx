import { AdminShell } from "@/components/admin/AdminShell";
import { OrgSettingsForm } from "@/components/admin/OrgSettingsForm";

export default function AdminSettingsPage() {
  return (
    <AdminShell
      title="組織設定"
      description="ユーザーフロントの見た目と文言をカスタマイズします。保存すると即座にフロントに反映されます。"
    >
      <div className="max-w-3xl">
        <OrgSettingsForm />
      </div>
    </AdminShell>
  );
}
