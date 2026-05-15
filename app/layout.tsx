import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { OrgProvider } from "@/components/OrgProvider";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "オンボーディング Q&A（モック）",
  description: "新人・バイト向けオンボーディング Q&A システムのモック版",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
      <body className="h-full">
        <OrgProvider>{children}</OrgProvider>
      </body>
    </html>
  );
}
