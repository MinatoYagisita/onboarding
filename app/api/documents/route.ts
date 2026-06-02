import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg, notFound, withApiHandler } from "@/lib/api";
import { extractText, SUPPORTED_MIME_TYPES } from "@/lib/extract";
import { uploadToS3 } from "@/lib/storage";
import { logger } from "@/lib/logger";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export const GET = withApiHandler("GET /api/documents", async (req) => {
  const org = await resolveOrg(req);
  if (!org) return notFound("組織が見つかりません");

  const docs = await db.document.findMany({
    where: { organizationId: org.id, deletedAt: null },
    orderBy: { uploadedAt: "desc" },
  });

  return Response.json({
    items: docs.map((d) => ({
      id: d.id,
      title: d.title,
      mimeType: d.mimeType,
      sizeBytes: d.sizeBytes,
      sourceType: d.sourceType,
      uploadedAt: d.uploadedAt.toISOString(),
    })),
  });
});

export const POST = withApiHandler("POST /api/documents", async (req, { requestId, userId }) => {
  const org = await resolveOrg(req);
  if (!org) return notFound("組織が見つかりません");

  const formData = await req.formData();
  const file = formData.get("file");
  const titleField = formData.get("title");

  if (!file || typeof file === "string") {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "ファイルが必要です" } }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: { code: "FILE_TOO_LARGE", message: "ファイルサイズが10MBを超えています" } }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!SUPPORTED_MIME_TYPES[mimeType]) {
    return Response.json(
      { error: { code: "UNSUPPORTED_FILE_TYPE", message: "対応していないファイル形式です。PDF・TXT・DOCXのみ対応しています" } },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let content: string | null = null;
  try {
    content = await extractText(buffer, mimeType);
  } catch (err) {
    // テキスト抽出失敗はドキュメント登録を止めない（警告のみ）
    logger.warn({
      requestId,
      path: "POST /api/documents",
      method: "POST",
      userId,
      message: "Text extraction failed",
      context: {
        fileName: file.name,
        mimeType,
        cause: err instanceof Error ? err.message : String(err),
      },
    });
  }

  const title = typeof titleField === "string" && titleField.trim() ? titleField.trim() : file.name;
  const storageKey = `org/${org.id}/${Date.now()}_${file.name}`;

  await uploadToS3(storageKey, buffer, mimeType);

  const doc = await db.document.create({
    data: { organizationId: org.id, title, mimeType, storageKey, sizeBytes: file.size, sourceType: "upload", content },
  });

  return Response.json(
    {
      id: doc.id,
      title: doc.title,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      sourceType: doc.sourceType,
      uploadedAt: doc.uploadedAt.toISOString(),
    },
    { status: 201 }
  );
});
