import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { headers } from "next/headers";
import { OrgProvider } from "@/components/OrgProvider";
import { orgProfile as defaultOrgProfile } from "@/lib/orgProfile";
import { db } from "@/lib/db";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "オンボーディング Q&A",
  description: "新人・バイト向けオンボーディング Q&A システム",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const slug =
    (await headers()).get("x-organization-slug") ??
    process.env.DEFAULT_ORG_SLUG;

  const org = slug
    ? await db.organization
        .findFirst({ where: { slug, deletedAt: null }, include: { settings: true } })
        .catch(() => null)
    : null;

  const s = org?.settings;

  const initialProfile = {
    orgName: s?.orgNameDisplay ?? org?.name ?? defaultOrgProfile.orgName,
    productSubtitle: s?.productSubtitle ?? defaultOrgProfile.productSubtitle,
    logoUrl: s?.logoUrl ?? defaultOrgProfile.logoUrl,
    brandPrimary: s?.brandPrimary ?? defaultOrgProfile.brandPrimary,
    welcomeHeroTitle: s?.welcomeHeroTitle ?? defaultOrgProfile.welcomeHeroTitle,
    welcomeHeroDescription:
      s?.welcomeHeroDescription ?? defaultOrgProfile.welcomeHeroDescription,
    askTabLabel: s?.askTabLabel ?? defaultOrgProfile.askTabLabel,
    faqTabLabel: s?.faqTabLabel ?? defaultOrgProfile.faqTabLabel,
  };

  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
      <body className="h-full">
        <OrgProvider initialProfile={initialProfile}>{children}</OrgProvider>
      </body>
    </html>
  );
}
