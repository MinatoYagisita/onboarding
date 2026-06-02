import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";
import { getOrgApiKeyStatus } from "@/lib/secrets";

export const GET = withApiHandler("GET /api/admin/api-key", async (req: NextRequest) => {
  const session = await requireAdminSession(req);
  const status = await getOrgApiKeyStatus(session.organizationId);
  return Response.json({ ...status, orgId: session.organizationId });
});
