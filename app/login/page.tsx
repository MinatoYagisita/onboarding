import { headers } from "next/headers";
import { LoginForm } from "@/components/LoginForm";
import { LoginHeader } from "@/components/LoginHeader";
import { PoweredBy } from "@/components/PoweredBy";

export default async function LoginPage() {
  const h = await headers();
  const orgSlug = h.get("x-organization-slug") ?? process.env.DEFAULT_ORG_SLUG ?? "sprout";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbf9] px-4 py-10">
      <div className="w-full max-w-sm">
        <LoginHeader />

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)]">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">ログイン</h2>
          <LoginForm orgSlug={orgSlug} />
        </div>

        <PoweredBy className="mt-8" />
      </div>
    </div>
  );
}
