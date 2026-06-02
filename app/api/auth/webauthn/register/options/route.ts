import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { startRegistration } from "@/lib/webauthn";

export const POST = withApiHandler(
  "POST /api/auth/webauthn/register/options",
  async (req) => {
    const session = await requireSession(req);
    const options = await startRegistration(session.id, session.email, session.displayName);
    return NextResponse.json(options);
  },
);
