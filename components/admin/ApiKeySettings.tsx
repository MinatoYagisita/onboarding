"use client";

import { useEffect, useState } from "react";

type Status = { configured: boolean; provider: string | null; devMode: boolean; orgId: string };

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  claude: "Anthropic Claude",
};

export function ApiKeySettings() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/admin/api-key")
      .then((r) => r.json())
      .then((d: Status) => setStatus(d))
      .catch(() => setStatus({ configured: false, provider: null, devMode: false, orgId: "" }));
  }, []);

  if (status === null) {
    return <div className="text-sm text-gray-400">確認中...</div>;
  }

  if (status.devMode) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
            開発環境
          </span>
          {status.configured && (
            <span className="text-sm text-gray-600">
              プロバイダ: <span className="font-medium">{PROVIDER_LABELS[status.provider ?? ""] ?? status.provider}</span>
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          ローカル開発環境では <code className="bg-gray-100 px-1 rounded">.env.local</code> の{" "}
          <code className="bg-gray-100 px-1 rounded">GROQ_API_KEY</code> /{" "}
          <code className="bg-gray-100 px-1 rounded">ANTHROPIC_API_KEY</code> が使用されます。
          本番環境では AWS Secrets Manager へ直接登録してください。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {status.configured ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              設定済み
            </span>
            <span className="text-sm text-gray-600">
              プロバイダ: <span className="font-medium text-gray-800">{PROVIDER_LABELS[status.provider ?? ""] ?? status.provider}</span>
            </span>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            未設定（AI 機能が使えません）
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400">
        API キーの登録・変更は AWS Secrets Manager で行います。
      </p>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-all">
        {`aws secretsmanager put-secret-value \\\n  --secret-id "onboarding/${status.orgId}/api-key" \\\n  --secret-string '{"provider":"claude","apiKey":"sk-ant-..."}'`}
      </div>
    </div>
  );
}
