import { z } from "zod";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resolveOrg, validationError, notFound, withApiHandler } from "@/lib/api";

export const GET = withApiHandler("GET /api/org/settings", async (req) => {
  const org = await resolveOrg(req);
  if (!org) return notFound("組織が見つかりません");

  const settings = await db.orgSetting.findFirst({ where: { organizationId: org.id } });

  return Response.json({
    id: org.id,
    orgName: settings?.orgNameDisplay ?? org.name,
    productSubtitle: settings?.productSubtitle ?? "オンボーディング Q&A",
    logoUrl: settings?.logoUrl ?? null,
    brandPrimary: settings?.brandPrimary ?? "#84cc16",
    welcomeHeroTitle: settings?.welcomeHeroTitle ?? "今日は何を知りたいですか？",
    welcomeHeroDescription: settings?.welcomeHeroDescription ?? "勤怠・服装・店舗ルールまで、組織の資料からAIが答えます。",
    askTabLabel: settings?.askTabLabel ?? "質問する",
    faqTabLabel: settings?.faqTabLabel ?? "よくある質問",
  });
});

const PatchSchema = z.object({
  orgName: z.string().min(1).max(50).optional(),
  productSubtitle: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  brandPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  welcomeHeroTitle: z.string().min(1).max(50).optional(),
  welcomeHeroDescription: z.string().min(1).max(200).optional(),
  askTabLabel: z.string().min(1).max(20).optional(),
  faqTabLabel: z.string().min(1).max(20).optional(),
});

export const PATCH = withApiHandler("PATCH /api/org/settings", async (req) => {
  const org = await resolveOrg(req);
  if (!org) return notFound("組織が見つかりません");

  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues.map((e) => ({ field: e.path.join("."), message: e.message })));
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};
  if (data.orgName !== undefined) updateData.orgNameDisplay = data.orgName;
  if (data.productSubtitle !== undefined) updateData.productSubtitle = data.productSubtitle;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.brandPrimary !== undefined) updateData.brandPrimary = data.brandPrimary;
  if (data.welcomeHeroTitle !== undefined) updateData.welcomeHeroTitle = data.welcomeHeroTitle;
  if (data.welcomeHeroDescription !== undefined) updateData.welcomeHeroDescription = data.welcomeHeroDescription;
  if (data.askTabLabel !== undefined) updateData.askTabLabel = data.askTabLabel;
  if (data.faqTabLabel !== undefined) updateData.faqTabLabel = data.faqTabLabel;

  await db.orgSetting.upsert({
    where: { organizationId: org.id },
    update: updateData,
    create: { organizationId: org.id, orgNameDisplay: data.orgName ?? org.name, ...updateData },
  });

  return Response.json({ ok: true });
});
