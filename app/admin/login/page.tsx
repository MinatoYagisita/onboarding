import { headers } from "next/headers";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { LoginHeader } from "@/components/LoginHeader";
import { PoweredBy } from "@/components/PoweredBy";

export default async function AdminLoginPage() {
  const h = await headers();
  const orgSlug = h.get("x-organization-slug") ?? process.env.DEFAULT_ORG_SLUG ?? "sprout";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <LoginHeader />

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            管理画面にログイン
          </h2>
          <AdminLoginForm orgSlug={orgSlug} />
        </div>

        <PoweredBy className="mt-8" />
      </div>
    </div>
  );
}
