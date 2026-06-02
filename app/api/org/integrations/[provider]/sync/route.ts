import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg } from "@/lib/api";
import { syncConnection } from "@/lib/drive-sync";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const org = await resolveOrg(req);
  if (!org) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const dbProvider = provider === "google-drive" ? "google_drive" : provider === "box" ? "box" : null;
  if (!dbProvider) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const connection = await db.driveConnection.findUnique({
    where: { organizationId_provider: { organizationId: org.id, provider: dbProvider as "google_drive" | "box" } },
  });
  if (!connection) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  try {
    await syncConnection(connection);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "SYNC_FAILED", message: String(err) } },
      { status: 500 }
    );
  }
}
