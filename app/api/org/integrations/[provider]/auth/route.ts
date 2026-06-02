import { NextRequest, NextResponse } from "next/server";
import { resolveOrg } from "@/lib/api";
import { getAuthUrl as googleAuthUrl } from "@/lib/drive-google";
import { getAuthUrl as boxAuthUrl } from "@/lib/drive-box";
import { encrypt } from "@/lib/encrypt";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const org = await resolveOrg(req);
  if (!org) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  // state に組織ID + タイムスタンプを暗号化して CSRF 対策
  const state = encrypt(JSON.stringify({ organizationId: org.id, ts: Date.now() }));

  let authUrl: string;
  if (provider === "google-drive") {
    authUrl = googleAuthUrl(state);
  } else if (provider === "box") {
    authUrl = boxAuthUrl(state);
  } else {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  return NextResponse.json({ authUrl });
}
