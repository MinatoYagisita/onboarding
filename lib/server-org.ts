import { db } from "./db";

export async function getDefaultOrg() {
  const slug = process.env.DEFAULT_ORG_SLUG;
  if (!slug) return null;
  return db.organization.findFirst({
    where: { slug, deletedAt: null },
    include: { settings: true },
  });
}
