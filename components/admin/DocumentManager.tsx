"use client";

import { useState, useRef } from "react";

type Doc = {
  id: string;
  title: string;
  mimeType: string;
  sizeBytes: number;
  sourceType: string;
  uploadedAt: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function mimeLabel(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime === "text/plain") return "TXT";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
  return mime.split("/")[1]?.toUpperCase() ?? mime;
}

export function DocumentManager({ initialDocuments }: { initialDocuments: Doc[] }) {
  const [docs, setDocs] = useState<Doc[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: form });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? "アップロードに失敗しました");
        return;
      }
      const created: Doc = await res.json();
      setDocs((prev) => [created, ...prev]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (doc: Doc) => {
    if (!confirm(`「${doc.title}」を削除しますか？AIの回答に使われなくなります。`)) return;
    const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    if (res.ok) setDocs((prev) => prev.filter((d) => d.id !== doc.id));
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-5">
        <div className="flex-1 text-sm text-gray-600">
          PDF・TXT・DOCX（最大10MB）をアップロードするとAIの回答に使われます。
        </div>
        <label className="cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          {uploading ? "アップロード中..." : "ファイルを選択"}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {docs.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-gray-500">
          資料がありません。上からアップロードしてください。
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">タイトル</th>
                <th className="px-4 py-3 text-left font-medium">形式</th>
                <th className="px-4 py-3 text-left font-medium">サイズ</th>
                <th className="px-4 py-3 text-left font-medium">取り込み元</th>
                <th className="px-4 py-3 text-left font-medium">アップロード日時</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">{doc.title}</td>
                  <td className="px-4 py-3 text-gray-500">{mimeLabel(doc.mimeType)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatBytes(doc.sizeBytes)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {doc.sourceType === "google_drive" ? "Google Drive" : doc.sourceType === "box" ? "Box" : "手動"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(doc.uploadedAt).toLocaleString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
