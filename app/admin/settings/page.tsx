import { AdminShell } from "@/components/admin/AdminShell";
import { OrgSettingsForm } from "@/components/admin/OrgSettingsForm";
import { IntegrationSettings } from "@/components/admin/IntegrationSettings";
import { ApiKeySettings } from "@/components/admin/ApiKeySettings";
import { NotificationSettings } from "@/components/admin/NotificationSettings";

export default function AdminSettingsPage() {
  return (
    <AdminShell
      title="組織設定"
      description="ユーザーフロントの見た目・文言と外部ストレージ連携を管理します。"
    >
      <div className="max-w-3xl flex flex-col gap-10">
        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-4">デザイン・文言</h2>
          <OrgSettingsForm />
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-1">AI API キー</h2>
          <p className="text-sm text-gray-500 mb-4">
            この組織の AI 回答に使用するキーの設定状況です。
          </p>
          <ApiKeySettings />
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-1">通知設定</h2>
          <p className="text-sm text-gray-500 mb-4">
            未回答・エスカレーション発生時の通知先を設定します（Slack・メール・Teams）。
          </p>
          <NotificationSettings />
        </section>

        <section>
          <h2 className="text-base font-semibold text-gray-800 mb-1">外部ストレージ連携</h2>
          <p className="text-sm text-gray-500 mb-4">
            Google Drive または Box のフォルダを指定すると、資料を自動取り込みして AI の回答に使用します。
          </p>
          <IntegrationSettings />
        </section>
      </div>
    </AdminShell>
  );
}
