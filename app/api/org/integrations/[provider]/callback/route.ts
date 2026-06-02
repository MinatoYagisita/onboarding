import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encrypt";
import { exchangeCode as googleExchange } from "@/lib/drive-google";
import { exchangeCode as boxExchange } from "@/lib/drive-box";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/admin/settings?error=oauth_failed`);
  }

  let organizationId: string;
  try {
    const decoded = JSON.parse(decrypt(state));
    organizationId = decoded.organizationId;
  } catch (err) {
    console.error("[OAuth] Invalid state parameter:", err);
    return NextResponse.redirect(`${baseUrl}/admin/settings?error=invalid_state`);
  }

  try {
    let encryptedToken: string;
    let dbProvider: "google_drive" | "box";

    if (provider === "google-drive") {
      encryptedToken = await googleExchange(code);
      dbProvider = "google_drive";
    } else if (provider === "box") {
      encryptedToken = await boxExchange(code);
      dbProvider = "box";
    } else {
      return NextResponse.redirect(`${baseUrl}/admin/settings?error=unknown_provider`);
    }

    await db.driveConnection.upsert({
      where: { organizationId_provider: { organizationId, provider: dbProvider } },
      create: { organizationId, provider: dbProvider, encryptedRefreshToken: encryptedToken },
      update: { encryptedRefreshToken: encryptedToken, lastSyncError: null },
    });

    return NextResponse.redirect(`${baseUrl}/admin/settings?connected=${provider}`);
  } catch (err) {
    console.error("[oauth callback]", err);
    return NextResponse.redirect(`${baseUrl}/admin/settings?error=oauth_failed`);
  }
}
