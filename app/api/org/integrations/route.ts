import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg } from "@/lib/api";

export async function GET(req: NextRequest) {
  const org = await resolveOrg(req);
  if (!org) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const [connections, docCounts] = await Promise.all([
    db.driveConnection.findMany({ where: { organizationId: org.id } }),
    db.document.groupBy({
      by: ["sourceType"],
      where: { organizationId: org.id, deletedAt: null, sourceType: { in: ["google_drive", "box"] } },
      _count: { id: true },
    }),
  ]);

  const countMap = new Map(docCounts.map((r) => [r.sourceType, r._count.id]));
  const map = new Map(connections.map((c) => [c.provider, c]));

  const providers = ["google_drive", "box"].map((provider) => {
    const c = map.get(provider as "google_drive" | "box");
    if (!c) return { provider, connected: false };
    return {
      provider,
      connected: true,
      folderId: c.folderId,
      folderName: c.folderName,
      syncEnabled: c.syncEnabled,
      lastSyncedAt: c.lastSyncedAt,
      lastSyncError: c.lastSyncError,
      documentCount: countMap.get(provider) ?? 0,
    };
  });

  return NextResponse.json({ providers });
}
