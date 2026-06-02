import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { withApiHandler, validationError } from "@/lib/api";
import { requireAdminSession } from "@/lib/session";

export const GET = withApiHandler(
  "GET /api/admin/notifications",
  async (req: NextRequest) => {
    const session = await requireAdminSession(req);

    const channels = await db.notificationChannel.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({
      channels: channels.map((ch) => ({
        id: ch.id,
        type: ch.type,
        destination: ch.destination,
        enabled: ch.enabled,
      })),
    });
  },
);

const PatchSchema = z.object({
  channels: z.array(
    z.object({
      type: z.enum(["slack", "email", "teams"]),
      destination: z.string().min(1).max(500),
      enabled: z.boolean(),
    }),
  ),
});

export const PATCH = withApiHandler(
  "PATCH /api/admin/notifications",
  async (req: NextRequest) => {
    const session = await requireAdminSession(req);

    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })),
      );
    }

    // 既存を全削除して再作成（シンプルな全置換）
    await db.notificationChannel.deleteMany({
      where: { organizationId: session.organizationId },
    });
    await db.notificationChannel.createMany({
      data: parsed.data.channels.map((ch) => ({
        organizationId: session.organizationId,
        type: ch.type,
        destination: ch.destination,
        enabled: ch.enabled,
      })),
    });

    return Response.json({ ok: true });
  },
);
