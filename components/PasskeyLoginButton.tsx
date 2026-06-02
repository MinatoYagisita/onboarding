"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";

interface Props {
  email: string;
  orgSlug: string;
  adminLogin?: boolean;
  onError?: (msg: string) => void;
}

export function PasskeyLoginButton({ email, orgSlug, adminLogin = false, onError }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePasskey() {
    setLoading(true);
    try {
      // 1. オプション取得
      const optRes = await fetch("/api/auth/webauthn/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, organizationSlug: orgSlug }),
      });
      if (!optRes.ok) {
        const d = await optRes.json().catch(() => ({}));
        onError?.(d?.error?.message ?? "生体認証の開始に失敗しました。");
        return;
      }
      const options = await optRes.json();

      // 2. ブラウザ認証
      const credential = await startAuthentication({ optionsJSON: options });

      // 3. 検証
      const verRes = await fetch("/api/auth/webauthn/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credential, adminLogin }),
      });
      if (!verRes.ok) {
        const d = await verRes.json().catch(() => ({}));
        onError?.(d?.error?.message ?? "生体認証に失敗しました。");
        return;
      }
      router.push(adminLogin ? "/admin" : "/");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        onError?.("生体認証がキャンセルされました。");
      } else {
        onError?.("生体認証に失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handlePasskey}
      disabled={loading || !email}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FingerprintIcon />
      {loading ? "認証中..." : "パスキーでログイン"}
    </button>
  );
}

function FingerprintIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </svg>
  );
}
