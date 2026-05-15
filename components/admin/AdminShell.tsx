import { PoweredBy } from "../PoweredBy";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

// 管理画面の共通レイアウト。
// サイドバー（組織ロゴ + メニュー）+ ヘッダー + メイン + フッター（Powered by）の構造。
export function AdminShell({ title, description, children }: Props) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader title={title} description={description} />
        <main className="flex-1 overflow-y-auto bg-slate-50 px-6 py-6">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-2">
          <PoweredBy />
        </footer>
      </div>
    </div>
  );
}
