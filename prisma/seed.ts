import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding...");

  // ── Organization ──────────────────────────────
  const org = await db.organization.upsert({
    where: { slug: "sprout" },
    update: {},
    create: {
      id: "org_sprout",
      slug: "sprout",
      name: "Sprout株式会社",
    },
  });

  // ── OrgSettings ───────────────────────────────
  await db.orgSetting.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      brandPrimary: "#84cc16",
      orgNameDisplay: "Sprout株式会社",
      productSubtitle: "オンボーディング Q&A",
      welcomeHeroTitle: "今日は何を知りたいですか？",
      welcomeHeroDescription:
        "勤怠・服装・店舗ルールまで、組織の資料からAIが答えます。",
      askTabLabel: "質問する",
      faqTabLabel: "よくある質問",
    },
  });

  // ── Admin User ────────────────────────────────
  const adminUser = await db.user.upsert({
    where: { email: "admin@sprout.example.com" },
    update: {},
    create: {
      id: "usr_admin",
      email: "admin@sprout.example.com",
      displayName: "管理者",
    },
  });

  await db.userMembership.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: org.id } },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: org.id,
      role: UserRole.admin,
    },
  });

  // ── Member User ───────────────────────────────
  const memberUser = await db.user.upsert({
    where: { email: "member@sprout.example.com" },
    update: {},
    create: {
      id: "usr_member",
      email: "member@sprout.example.com",
      displayName: "田中 太郎",
    },
  });

  await db.userMembership.upsert({
    where: { userId_organizationId: { userId: memberUser.id, organizationId: org.id } },
    update: {},
    create: {
      userId: memberUser.id,
      organizationId: org.id,
      role: UserRole.member,
    },
  });

  // ── Categories ────────────────────────────────
  const categoryDefs = [
    { slug: "first-day",   name: "入社初日に多い質問", sortOrder: 0 },
    { slug: "attendance",  name: "勤怠・シフト",       sortOrder: 1 },
    { slug: "dress-code",  name: "服装・持ち物",       sortOrder: 2 },
    { slug: "leave-break", name: "有給・休憩",         sortOrder: 3 },
    { slug: "store-rule",  name: "店舗ルール",         sortOrder: 4 },
    { slug: "trouble",     name: "トラブル時",         sortOrder: 5 },
  ];

  const categories: Record<string, string> = {};
  for (const def of categoryDefs) {
    const cat = await db.category.upsert({
      where: { organizationId_slug: { organizationId: org.id, slug: def.slug } },
      update: {},
      create: { organizationId: org.id, ...def },
    });
    categories[def.slug] = cat.id;
  }

  // ── FAQs ──────────────────────────────────────
  const faqDefs = [
    {
      id: "faq_break_minutes",
      categorySlug: "leave-break",
      question: "休憩は何分取れますか？",
      askedCount: 0,
      isPublished: true,
      answer: {
        conclusion: "勤務が6時間を超える場合は45分、8時間を超える場合は60分の休憩が取れます。",
        evidence: "就業規則 第4章「勤務時間・休憩・休日」第18条に、労働基準法に準拠した休憩時間の規定があります。",
        supplement: "休憩は勤務時間の途中で一括取得が原則です。分割取得したい場合は店長への事前相談が必要です。",
        caution: "休憩中はタイムカードを必ず切ってください。切り忘れは勤怠修正申請が必要になります。",
        contact: "勤怠に関する質問は、各店舗の店長または本社人事部までご連絡ください。",
        sources: [
          { title: "就業規則.pdf", section: "第18条 休憩時間" },
          { title: "勤怠運用マニュアル.pdf", section: "2. 休憩の取り方" },
        ],
      },
    },
    {
      id: "faq_paid_leave",
      categorySlug: "leave-break",
      question: "有給はいつから付与されますか？",
      askedCount: 0,
      isPublished: true,
      answer: {
        conclusion: "入社日から6ヶ月経過後に10日付与されます。以降は毎年同じ月に加算されます。",
        evidence: "就業規則 第5章第23条および労働基準法第39条に基づく付与ルールです。出勤率80%以上が条件となります。",
        supplement: "パート・アルバイトの方も所定労働日数に応じて比例付与されます。",
        caution: "有給は取得希望日の2週間前までに申請が必要です。繁忙期は時季変更をお願いする場合があります。",
        contact: "有給の残日数確認・申請は勤怠システム、または本社人事部までご連絡ください。",
        sources: [
          { title: "就業規則.pdf", section: "第23条 年次有給休暇" },
          { title: "有給取得ガイド.pdf" },
        ],
      },
    },
    {
      id: "faq_dress_code",
      categorySlug: "dress-code",
      question: "服装・身だしなみのルールを教えてください",
      askedCount: 0,
      isPublished: true,
      answer: {
        conclusion: "制服着用が必須です。髪色・ネイル・アクセサリーには制限があります。",
        evidence: "店舗運営マニュアル「身だしなみ基準」に詳細が記載されています。",
        supplement: "制服は入社時に貸与されます。汚損・紛失の場合は速やかに報告してください。",
        caution: "接客業のため清潔感を最優先とします。基準を満たさない場合は入店前に対応が必要です。",
        contact: "身だしなみに関するご不明点は所属店舗の店長にご確認ください。",
        sources: [
          { title: "店舗運営マニュアル.pdf", section: "身だしなみ基準" },
        ],
      },
    },
    {
      id: "faq_first_day",
      categorySlug: "first-day",
      question: "初日はどんな持ち物が必要ですか？",
      askedCount: 0,
      isPublished: true,
      answer: {
        conclusion: "印鑑・マイナンバー書類・口座情報・筆記用具をご持参ください。",
        evidence: "入社手続きガイド「初日に必要な持ち物リスト」に記載されています。",
        supplement: "制服サイズ確認のため、体のサイズを把握しておくとスムーズです。",
        contact: "不明な点は採用担当または各店舗の責任者までご連絡ください。",
        sources: [
          { title: "入社手続きガイド.pdf", section: "初日に必要な持ち物" },
        ],
      },
    },
  ];

  for (const def of faqDefs) {
    await db.faq.upsert({
      where: { id: def.id },
      update: {},
      create: {
        id: def.id,
        organizationId: org.id,
        categoryId: categories[def.categorySlug],
        question: def.question,
        answer: def.answer,
        askedCount: def.askedCount,
        isPublished: def.isPublished,
      },
    });
  }

  console.log("✅ Seed complete");
  console.log(`   Organization : ${org.slug} (${org.id})`);
  console.log(`   Users        : admin + member`);
  console.log(`   Categories   : ${categoryDefs.length}`);
  console.log(`   FAQs         : ${faqDefs.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
