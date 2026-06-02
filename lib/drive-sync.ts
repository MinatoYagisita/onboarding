import { db } from "./db";
import { extractText, SUPPORTED_MIME_TYPES } from "./extract";
import { uploadToS3 } from "./storage";
import { logger } from "./logger";
import * as googleDrive from "./drive-google";
import * as box from "./drive-box";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export async function syncOrganization(organizationId: string) {
  const connections = await db.driveConnection.findMany({
    where: { organizationId, syncEnabled: true },
  });
  await Promise.all(connections.map((c) => syncConnection(c)));
}

export async function syncConnection(connection: {
  id: string;
  organizationId: string;
  provider: string;
  folderId: string | null;
  encryptedRefreshToken: string;
}) {
  if (!connection.folderId) return;

  try {
    if (connection.provider === "google_drive") {
      await syncGoogleDrive(connection as typeof connection & { folderId: string });
    } else {
      await syncBox(connection as typeof connection & { folderId: string });
    }
    await db.driveConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), lastSyncError: null },
    });
  } catch (err) {
    await db.driveConnection.update({
      where: { id: connection.id },
      data: { lastSyncError: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

async function syncGoogleDrive(connection: {
  id: string;
  organizationId: string;
  folderId: string;
  encryptedRefreshToken: string;
}) {
  const remoteFiles = await googleDrive.listFiles(
    connection.encryptedRefreshToken,
    connection.folderId
  );

  const existing = await db.document.findMany({
    where: { organizationId: connection.organizationId, sourceType: "google_drive", deletedAt: null },
    select: { id: true, externalId: true, externalModifiedAt: true },
  });
  const existingMap = new Map(existing.map((d) => [d.externalId, d]));
  const remoteIds = new Set<string>();

  for (const file of remoteFiles) {
    if (!file.id || !file.mimeType) continue;
    const mimeType = SUPPORTED_MIME_TYPES[file.mimeType];
    if (!mimeType) continue;

    const fileSize = file.size ? parseInt(file.size) : 0;
    if (fileSize > MAX_FILE_BYTES) {
      logger.warn({
        requestId: "sync",
        path: "syncGoogleDrive",
        method: "SYNC",
        userId: "system",
        message: `ファイルサイズ超過のためスキップ: ${file.name} (${fileSize} bytes)`,
      });
      continue;
    }

    remoteIds.add(file.id);
    const doc = existingMap.get(file.id);
    const remoteModified = file.modifiedTime ? new Date(file.modifiedTime) : null;

    if (doc?.externalModifiedAt && remoteModified && doc.externalModifiedAt >= remoteModified) {
      continue;
    }

    try {
      const buffer = await googleDrive.downloadFile(
        connection.encryptedRefreshToken,
        file.id,
        file.mimeType
      );
      const extractMime =
        file.mimeType === "application/vnd.google-apps.document" ? "text/plain" : mimeType;
      const content = await extractText(buffer, extractMime);
      const storageKey = `org/${connection.organizationId}/gdrive_${file.id}`;
      await uploadToS3(storageKey, buffer, mimeType);

      if (doc) {
        await db.document.update({
          where: { id: doc.id },
          data: { externalModifiedAt: remoteModified, content, storageKey },
        });
      } else {
        await db.document.create({
          data: {
            organizationId: connection.organizationId,
            title: file.name ?? "タイトルなし",
            mimeType,
            storageKey,
            sizeBytes: fileSize,
            sourceType: "google_drive",
            externalId: file.id,
            externalModifiedAt: remoteModified,
            content,
          },
        });
      }
    } catch (e) {
      logger.warn({
        requestId: "sync",
        path: "syncGoogleDrive",
        method: "SYNC",
        userId: "system",
        message: `ファイルの処理に失敗しました: ${file.name ?? file.id}`,
        context: { cause: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  // フォルダから削除されたファイルを論理削除
  for (const doc of existing) {
    if (doc.externalId && !remoteIds.has(doc.externalId)) {
      await db.document.update({ where: { id: doc.id }, data: { deletedAt: new Date() } });
    }
  }
}

async function syncBox(connection: {
  id: string;
  organizationId: string;
  folderId: string;
  encryptedRefreshToken: string;
}) {
  const remoteFiles = await box.listFiles(connection.encryptedRefreshToken, connection.folderId);

  const existing = await db.document.findMany({
    where: { organizationId: connection.organizationId, sourceType: "box", deletedAt: null },
    select: { id: true, externalId: true, externalModifiedAt: true },
  });
  const existingMap = new Map(existing.map((d) => [d.externalId, d]));
  const remoteIds = new Set<string>();

  for (const file of remoteFiles) {
    const mimeType = SUPPORTED_MIME_TYPES[file.content_type ?? ""];
    if (!mimeType) continue;

    if (file.size > MAX_FILE_BYTES) {
      logger.warn({
        requestId: "sync",
        path: "syncBox",
        method: "SYNC",
        userId: "system",
        message: `ファイルサイズ超過のためスキップ: ${file.name} (${file.size} bytes)`,
      });
      continue;
    }

    remoteIds.add(file.id);
    const doc = existingMap.get(file.id);
    const remoteModified = file.modified_at ? new Date(file.modified_at) : null;

    if (doc?.externalModifiedAt && remoteModified && doc.externalModifiedAt >= remoteModified) {
      continue;
    }

    try {
      const buffer = await box.downloadFile(connection.encryptedRefreshToken, file.id);
      const content = await extractText(buffer, mimeType);
      const storageKey = `org/${connection.organizationId}/box_${file.id}`;
      await uploadToS3(storageKey, buffer, mimeType);

      if (doc) {
        await db.document.update({
          where: { id: doc.id },
          data: { externalModifiedAt: remoteModified, content, storageKey },
        });
      } else {
        await db.document.create({
          data: {
            organizationId: connection.organizationId,
            title: file.name,
            mimeType,
            storageKey,
            sizeBytes: file.size,
            sourceType: "box",
            externalId: file.id,
            externalModifiedAt: remoteModified,
            content,
          },
        });
      }
    } catch (e) {
      logger.warn({
        requestId: "sync",
        path: "syncBox",
        method: "SYNC",
        userId: "system",
        message: `ファイルの処理に失敗しました: ${file.name ?? file.id}`,
        context: { cause: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  // フォルダから削除されたファイルを論理削除
  for (const doc of existing) {
    if (doc.externalId && !remoteIds.has(doc.externalId)) {
      await db.document.update({ where: { id: doc.id }, data: { deletedAt: new Date() } });
    }
  }
}
