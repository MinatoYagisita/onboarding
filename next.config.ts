import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse / mammoth は動的 require や PDF.js worker を使うため
  // webpack バンドル対象から外してネイティブの Node.js モジュールとして扱う
  serverExternalPackages: ["pdf-parse", "mammoth", "groq-sdk"],
};

export default nextConfig;
