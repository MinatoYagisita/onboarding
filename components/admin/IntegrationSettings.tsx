"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type ProviderInfo = {
  provider: string;
  connected: boolean;
  folderId?: string | null;
  folderName?: string | null;
  syncEnabled?: boolean;
  lastSyncedAt?: string | null;
  lastSyncError?: string | null;
  documentCount?: number;
};

type IntegrationsState = {
  google_drive: ProviderInfo;
  box: ProviderInfo;
};

const PROVIDER_LABELS: Record<string, { name: string; icon: string }> = {
  google_drive: { name: "Google Drive", icon: "📁" },
  box: { name: "Box", icon: "📦" },
};

const API_PROVIDER: Record<string, string> = {
  google_drive: "google-drive",
  box: "box",
};

export function IntegrationSettings() {
  const [data, setData] = useState<IntegrationsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncClientError, setSyncClientError] = useState<string | null>(null);
  const [folderInputs, setFolderInputs] = useState<Record<string, string>>({});
  const [showBoxPicker, setShowBoxPicker] = useState(false);
  const boxPickerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/org/integrations");
    if (!res.ok) return;
    const json = await res.json();
    const map: Partial<IntegrationsState> = {};
    for (const p of json.providers) {
      map[p.provider as keyof IntegrationsState] = p;
    }
    setData(map as IntegrationsState);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // URLパラメータで接続結果を通知
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected")) {
      load();
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [load]);

  const handleConnect = async (provider: string) => {
    const res = await fetch(`/api/org/integrations/${API_PROVIDER[provider]}/auth`, {
      method: "POST",
    });
    if (!res.ok) return;
    const { authUrl } = await res.json();
    window.location.href = authUrl;
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`${PROVIDER_LABELS[provider].name} の連携を解除しますか？`)) return;
    await fetch(`/api/org/integrations/${API_PROVIDER[provider]}`, { method: "DELETE" });
    await load();
  };

  const handleSaveFolder = async (provider: string, overrideFolderId?: string, overrideFolderName?: string) => {
    const folderId = overrideFolderId ?? folderInputs[provider]?.trim();
    if (!folderId) return;
    const res = await fetch(`/api/org/integrations/${API_PROVIDER[provider]}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
    if (res.ok) {
      const json = await res.json();
      setData((prev) =>
        prev
          ? {
              ...prev,
              [provider]: {
                ...prev[provider as keyof IntegrationsState],
                folderId,
                folderName: overrideFolderName ?? json.folderName,
              },
            }
          : prev
      );
      setFolderInputs((prev) => ({ ...prev, [provider]: "" }));
    }
  };

  const openGooglePicker = async () => {
    const tokenRes = await fetch("/api/org/integrations/google-drive/picker-token");
    if (!tokenRes.ok) return;
    const { accessToken } = await tokenRes.json();

    await new Promise<void>((resolve) => {
      if ((window as any).google?.picker) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => (window as any).gapi.load("picker", () => resolve());
      document.body.appendChild(script);
    });

    const google = (window as any).google;
    new google.picker.PickerBuilder()
      .addView(
        new google.picker.DocsView()
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true)
      )
      .setOAuthToken(accessToken)
      .setTitle("同期するフォルダを選択")
      .setCallback(async (data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const folder = data.docs[0];
          await handleSaveFolder("google_drive", folder.id, folder.name);
          await handleSync("google_drive");
        }
      })
      .build()
      .setVisible(true);
  };

  const openBoxPicker = async () => {
    const tokenRes = await fetch("/api/org/integrations/box/picker-token");
    if (!tokenRes.ok) return;
    const { accessToken } = await tokenRes.json();

    setShowBoxPicker(true);

    await new Promise<void>((resolve) => {
      if ((window as any).Box) { resolve(); return; }
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn01.boxcdn.net/platform/elements/20.0.0/en-US/picker.css";
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = "https://cdn01.boxcdn.net/platform/elements/20.0.0/en-US/picker.js";
      script.onload = () => resolve();
      document.body.appendChild(script);
    });

    if (!boxPickerRef.current) return;
    boxPickerRef.current.innerHTML = "";

    const picker = new (window as any).Box.FolderPicker();
    picker.show("0", accessToken, {
      container: boxPickerRef.current,
      canSetShareAccess: false,
      canCreateNewFolder: false,
      chooseButtonLabel: "このフォルダを選択",
      cancelButtonLabel: "キャンセル",
      onChoose: async (items: any[]) => {
        const folder = items[0];
        setShowBoxPicker(false);
        await handleSaveFolder("box", folder.id, folder.name);
        await handleSync("box");
      },
      onCancel: () => setShowBoxPicker(false),
    });
  };

  const handleToggleSync = async (provider: string, enabled: boolean) => {
    await fetch(`/api/org/integrations/${API_PROVIDER[provider]}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syncEnabled: enabled }),
    });
    await load();
  };

  const handleSync = async (provider: string) => {
    setSyncing(provider);
    setSyncClientError(null);
    try {
      const res = await fetch(`/api/org/integrations/${API_PROVIDER[provider]}/sync`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSyncClientError(body?.error?.message ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setSyncClientError(e instanceof Error ? e.message : "同期リクエストに失敗しました");
    } finally {
      await load();
      setSyncing(null);
    }
  };

  if (loading) return <div className="text-sm text-gray-400">読み込み中...</div>;

  const providers: (keyof IntegrationsState)[] = ["google_drive", "box"];

  return (
    <div className="flex flex-col gap-6">
      {providers.map((provider) => {
        const info = data![provider];
        const label = PROVIDER_LABELS[provider];

        return (
          <div key={provider} className="rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{label.icon}</span>
                <span className="font-semibold text-gray-800">{label.name}</span>
                {info.connected ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    接続済み
                  </span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    未接続
                  </span>
                )}
              </div>
              {info.connected ? (
                <button
                  onClick={() => handleDisconnect(provider)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  連携解除
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(provider)}
                  className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700"
                >
                  連携する
                </button>
              )}
            </div>

            {info.connected && (
              <>
                {/* フォルダ設定 */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-500 font-medium">同期フォルダ</label>
                  {info.folderName ? (
                    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700">📂 {info.folderName}</span>
                      <button
                        onClick={provider === "google_drive" ? openGooglePicker : openBoxPicker}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        変更
                      </button>
                    </div>
                  ) : null}
                  {!info.folderName && (
                    provider === "google_drive" ? (
                      <button
                        onClick={openGooglePicker}
                        className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 text-gray-700 w-fit"
                      >
                        <span>📁</span> Google Drive からフォルダを選択
                      </button>
                    ) : (
                      <button
                        onClick={openBoxPicker}
                        className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 text-gray-700 w-fit"
                      >
                        <span>📦</span> Box からフォルダを選択
                      </button>
                    )
                  )}
                </div>

                {/* 自動同期トグル */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">自動同期</span>
                  <button
                    onClick={() => handleToggleSync(provider, !info.syncEnabled)}
                    className={`relative w-10 h-5 rounded-full overflow-hidden transition-colors ${
                      info.syncEnabled ? "bg-green-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        info.syncEnabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* ドキュメント数 */}
                <div className="flex items-center gap-2">
                  {info.documentCount === 0 ? (
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5">
                      ⚠️ 同期済みドキュメントが 0 件です。「今すぐ同期」を実行してください。
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      同期済みドキュメント: <span className="font-medium text-gray-700">{info.documentCount} 件</span>
                    </span>
                  )}
                </div>

                {/* 最終同期 & 手動同期ボタン */}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {info.lastSyncedAt
                      ? `最終同期: ${new Date(info.lastSyncedAt).toLocaleString("ja-JP")}`
                      : "未同期"}
                  </span>
                  <button
                    onClick={() => handleSync(provider)}
                    disabled={syncing === provider || !info.folderId}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg disabled:opacity-40"
                  >
                    {syncing === provider ? "同期中..." : "今すぐ同期"}
                  </button>
                </div>

                {/* エラー表示 */}
                {syncClientError && (
                  <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    ⚠️ 同期エラー: {syncClientError}
                  </div>
                )}
                {!syncClientError && info.lastSyncError && (
                  <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">
                    {info.lastSyncError}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {showBoxPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-[780px] h-[520px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-800">同期するフォルダを選択</span>
              <button
                onClick={() => setShowBoxPicker(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div ref={boxPickerRef} className="flex-1 overflow-hidden" />
          </div>
        </div>
      )}
    </div>
  );
}
