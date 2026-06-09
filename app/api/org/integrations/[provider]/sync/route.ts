import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg } from "@/lib/api";
import { syncConnection } from "@/lib/drive-sync";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    const org = await resolveOrg(req);
    if (!org) return NextResponse.json({ error: { code: "NOT_FOUND", message: "組織が見つかりません" } }, { status: 404 });

    const dbProvider = provider === "google-drive" ? "google_drive" : provider === "box" ? "box" : null;
    if (!dbProvider) return NextResponse.json({ error: { code: "NOT_FOUND", message: "不明なプロバイダー" } }, { status: 404 });

    const connection = await db.driveConnection.findUnique({
      where: { organizationId_provider: { organizationId: org.id, provider: dbProvider as "google_drive" | "box" } },
    });
    if (!connection) return NextResponse.json({ error: { code: "NOT_FOUND", message: "接続情報が見つかりません" } }, { status: 404 });

    await syncConnection(connection);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sync route]", err);
    return NextResponse.json(
      { error: { code: "SYNC_FAILED", message: err instanceof Error ? err.message : String(err) } },
      { status: 500 }
    );
  }
}
