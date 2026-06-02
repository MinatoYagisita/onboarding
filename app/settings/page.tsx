import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { PasskeyManager } from "@/components/PasskeyManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession(false);
  if (!session) redirect("/login");

  const credentials = await db.webAuthnCredential.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← ホームに戻る
      </Link>
      <h1 className="mb-6 mt-2 text-lg font-bold text-gray-900">アカウント設定</h1>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-800">生体認証（パスキー）</h2>
        <p className="mb-4 text-sm text-gray-500">
          パスキーを登録すると、次回からメールアドレスとパスコードなしで、Touch ID・Face ID・Windows Hello などで素早くログインできます。
        </p>
        <PasskeyManager
          initialCredentials={credentials.map((c) => ({
            id: c.id,
            name: c.name,
            deviceType: c.deviceType,
            createdAt: c.createdAt.toISOString(),
            lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
          }))}
        />
      </section>
    </div>
  );
}
