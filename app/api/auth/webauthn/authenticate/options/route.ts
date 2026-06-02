import { NextResponse } from "next/server";
import { withApiHandler, validationError } from "@/lib/api";
import { startAuthentication } from "@/lib/webauthn";

export const POST = withApiHandler(
  "POST /api/auth/webauthn/authenticate/options",
  async (req) => {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const organizationSlug = String(body.organizationSlug ?? "").trim();
    if (!email) return validationError([{ field: "email", message: "メールアドレスは必須です" }]);
    if (!organizationSlug) return validationError([{ field: "organizationSlug", message: "organizationSlug は必須です" }]);

    const { db } = await import("@/lib/db");
    const org = await db.organization.findFirst({ where: { slug: organizationSlug, deletedAt: null } });
    if (!org) return validationError([{ field: "organizationSlug", message: "組織が見つかりません" }]);

    const options = await startAuthentication(email, org.id);
    return NextResponse.json(options);
  },
);
