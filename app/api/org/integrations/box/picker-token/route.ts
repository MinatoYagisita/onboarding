import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/session";
import { getAccessToken } from "@/lib/drive-box";

export async function GET(req: NextRequest) {
  const session = await requireAdminSession(req);
  const org = { id: session.organizationId };
  if (!org) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const connection = await db.driveConnection.findUnique({
    where: { organizationId_provider: { organizationId: org.id, provider: "box" } },
  });
  if (!connection) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const { accessToken } = await getAccessToken(connection.encryptedRefreshToken);
  return NextResponse.json({ accessToken });
}
