import { withParamsHandler, notFound } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

export const DELETE = withParamsHandler<{ credentialId: string }>(
  "DELETE /api/auth/webauthn/credentials/:credentialId",
  async (req, { credentialId }) => {
    const session = await requireSession(req);

    const cred = await db.webAuthnCredential.findUnique({ where: { id: credentialId } });
    if (!cred || cred.userId !== session.id) return notFound("パスキーが見つかりません");

    await db.webAuthnCredential.delete({ where: { id: credentialId } });
    return Response.json({ ok: true });
  },
);
