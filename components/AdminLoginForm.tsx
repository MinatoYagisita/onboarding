"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PasskeyLoginButton } from "@/components/PasskeyLoginButton";

interface Props {
  orgSlug: string;
}

export function AdminLoginForm({ orgSlug }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleResend() {
    setError(null);
    setResendSuccess(false);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/passcode/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, organizationSlug: orgSlug }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? "しばらく待ってから再試行してください。");
        return;
      }
      setResendSuccess(true);
      setResendCooldown(60);
      setCode("");
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/passcode/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, organizationSlug: orgSlug }),
      });
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? "しばらく待ってから再試行してください。");
        return;
      }
      setStep("code");
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/passcode/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, organizationSlug: orgSlug, passcode: code, adminLogin: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error?.message ?? "パスコードが正しくありません。");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15";
  const btnClass =
    "mt-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300";

  const errorEl = error && (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
      {error}
    </div>
  );

  if (step === "email") {
    return (
      <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="admin-email" className="text-xs font-medium text-gray-700">
            メールアドレス
          </label>
          <input
            id="admin-email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        {errorEl}
        <button type="submit" disabled={loading} className={btnClass}>
          {loading ? "送信中..." : "パスコードを送信"}
        </button>
        {email && (
          <>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">または</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <PasskeyLoginButton
              email={email}
              orgSlug={orgSlug}
              adminLogin
              onError={(msg) => setError(msg)}
            />
          </>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        <span className="font-medium text-gray-700">{email}</span> にパスコードを送信しました。
        メールを確認して6桁のコードを入力してください。
      </p>
      <div className="flex flex-col gap-1">
        <label htmlFor="admin-code" className="text-xs font-medium text-gray-700">
          パスコード（6桁）
        </label>
        <input
          id="admin-code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={inputClass}
        />
      </div>
      {resendSuccess && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          パスコードを再送しました。メールを確認してください。
        </div>
      )}
      {errorEl}
      <button type="submit" disabled={loading} className={btnClass}>
        {loading ? "確認中..." : "管理画面にログイン"}
      </button>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <button
          type="button"
          onClick={() => { setStep("email"); setCode(""); setError(null); setResendSuccess(false); }}
          className="hover:text-gray-700 underline"
        >
          メールアドレスを変更する
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={loading || resendCooldown > 0}
          className="hover:text-gray-700 underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {resendCooldown > 0 ? `再送する（${resendCooldown}秒後）` : "再送する"}
        </button>
      </div>
    </form>
  );
}
