"use client";

import { useState, useCallback } from "react";
import { startRegistration } from "@simplewebauthn/browser";

interface Credential {
  id: string;
  name: string | null;
  deviceType: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface Props {
  initialCredentials: Credential[];
}

export function PasskeyManager({ initialCredentials }: Props) {
  const [credentials, setCredentials] = useState<Credential[]>(initialCredentials);
  const [registering, setRegistering] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/auth/webauthn/credentials");
    if (res.ok) setCredentials(await res.json());
  }, []);

  async function handleRegister() {
    setRegistering(true);
    setError(null);
    setSuccess(null);
    try {
      const optRes = await fetch("/api/auth/webauthn/register/options", { method: "POST" });
      if (!optRes.ok) throw new Error("登録オプションの取得に失敗しました。");
      const options = await optRes.json();

      const credential = await startRegistration({ optionsJSON: options });

      const verRes = await fetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credential, name: keyName || null }),
      });
      if (!verRes.ok) {
        const d = await verRes.json().catch(() => ({}));
        throw new Error(d?.error?.message ?? "登録に失敗しました。");
      }
      setSuccess("パスキーを登録しました。");
      setKeyName("");
      await refresh();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("登録がキャンセルされました。");
      } else {
        setError(err instanceof Error ? err.message : "登録に失敗しました。");
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このパスキーを削除しますか？")) return;
    const res = await fetch(`/api/auth/webauthn/credentials/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await refresh();
    } else {
      setError("削除に失敗しました。");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-gray-900">パスキーを追加</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="名前（例: Touch ID）"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
          />
          <button
            onClick={handleRegister}
            disabled={registering}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {registering ? "登録中..." : "パスキーを追加"}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        {success && (
          <p className="text-xs text-green-600">{success}</p>
        )}
      </div>

      {credentials.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-gray-900">登録済みパスキー</h3>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {credentials.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-gray-800">
                    {c.name ?? "名前なし"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {c.deviceType === "multiDevice" ? "マルチデバイス" : "このデバイス"} •{" "}
                    登録日: {new Date(c.createdAt).toLocaleDateString("ja-JP")}
                    {c.lastUsedAt && (
                      <> • 最終使用: {new Date(c.lastUsedAt).toLocaleDateString("ja-JP")}</>
                    )}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
