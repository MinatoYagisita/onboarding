import { withApiHandler } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

export const GET = withApiHandler(
  "GET /api/auth/webauthn/credentials",
  async (req) => {
    const session = await requireSession(req);
    const creds = await db.webAuthnCredential.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(
      creds.map((c) => ({
        id: c.id,
        name: c.name,
        deviceType: c.deviceType,
        createdAt: c.createdAt.toISOString(),
        lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
      })),
    );
  },
);
