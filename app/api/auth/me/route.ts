import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api";
import { requireSession } from "@/lib/session";

export const GET = withApiHandler(
  "GET /api/auth/me",
  async (req: NextRequest) => {
    const session = await requireSession(req);
    return Response.json({
      user: {
        id: session.id,
        email: session.email,
        displayName: session.displayName,
        role: session.role,
      },
      organization: {
        id: session.organizationId,
        slug: session.organizationSlug,
      },
    });
  },
);
