import { NextResponse } from "next/server";
import { withApiHandler, validationError } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { finishRegistration } from "@/lib/webauthn";

export const POST = withApiHandler(
  "POST /api/auth/webauthn/register/verify",
  async (req) => {
    const session = await requireSession(req);
    const body = await req.json().catch(() => null);
    if (!body?.response) return validationError([{ field: "response", message: "認証応答が必要です" }]);

    const name = typeof body.name === "string" ? body.name : undefined;
    await finishRegistration(session.id, body, name);
    return NextResponse.json({ verified: true });
  },
);
