import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg } from "@/lib/api";
import { getFolderName as googleFolderName } from "@/lib/drive-google";
import { getFolderName as boxFolderName } from "@/lib/drive-box";

function toDbProvider(provider: string): "google_drive" | "box" | null {
  if (provider === "google-drive") return "google_drive";
  if (provider === "box") return "box";
  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const org = await resolveOrg(req);
  if (!org) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const dbProvider = toDbProvider(provider);
  if (!dbProvider) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const connection = await db.driveConnection.findUnique({
    where: { organizationId_provider: { organizationId: org.id, provider: dbProvider } },
  });
  if (!connection) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const body = await req.json();
  const { folderId, syncEnabled } = body;

  let folderName = connection.folderName;
  if (folderId && folderId !== connection.folderId) {
    try {
      if (dbProvider === "google_drive") {
        folderName = await googleFolderName(connection.encryptedRefreshToken, folderId);
      } else {
        folderName = await boxFolderName(connection.encryptedRefreshToken, folderId);
      }
    } catch (err) {
      console.error("[Drive] Failed to resolve folder name:", err);
      folderName = folderId;
    }
  }

  const updated = await db.driveConnection.update({
    where: { organizationId_provider: { organizationId: org.id, provider: dbProvider } },
    data: {
      ...(folderId !== undefined && { folderId, folderName }),
      ...(syncEnabled !== undefined && { syncEnabled }),
    },
  });

  return NextResponse.json({ ok: true, folderName: updated.folderName });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const org = await resolveOrg(req);
  if (!org) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const dbProvider = toDbProvider(provider);
  if (!dbProvider) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  await db.driveConnection.deleteMany({
    where: { organizationId: org.id, provider: dbProvider },
  });

  // 連携ドキュメントを論理削除
  await db.document.updateMany({
    where: { organizationId: org.id, sourceType: dbProvider, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
