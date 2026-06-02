import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/authShared";
import { verifyToken } from "@/lib/tokenSigning";

const FRONTEND_LOGIN = "/login";
const ADMIN_LOGIN = "/admin/login";

function extractOrgSlug(hostname: string): string | null {
  // {orgSlug}.app.example.com → orgSlug
  // localhost / localhost:3000 → null（環境変数にフォールバック）
  if (hostname.startsWith("localhost") || hostname.match(/^\d+\.\d+\.\d+\.\d+/)) {
    return null;
  }
  const parts = hostname.split(".");
  // サブドメインが1段階だけある場合（sprout.app.example.com → parts[0]）
  return parts.length >= 3 ? (parts[0] ?? null) : null;
}

const PUBLIC_API_PREFIXES = [
  "/api/auth/passcode/",
  "/api/auth/webauthn/authenticate/",
  "/api/auth/logout",
  "/api/auth/mock-login",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // 認証不要の公開APIは素通りさせる
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cookie の存在だけでなく HMAC 署名を検証する
  const frontToken = request.cookies.get(SESSION_COOKIE)?.value;
  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const hasFrontSession = frontToken ? Boolean(await verifyToken(frontToken)) : false;
  const hasAdminSession = adminToken ? Boolean(await verifyToken(adminToken)) : false;

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin =
    pathname === ADMIN_LOGIN || pathname.startsWith(`${ADMIN_LOGIN}/`);
  const isFrontendLogin =
    pathname === FRONTEND_LOGIN || pathname.startsWith(`${FRONTEND_LOGIN}/`);

  // サブドメインから組織スラッグを抽出してリクエストヘッダーに付与
  const orgSlug =
    extractOrgSlug(hostname) ?? process.env.DEFAULT_ORG_SLUG ?? "";

  const requestHeaders = new Headers(request.headers);
  if (orgSlug) requestHeaders.set("x-organization-slug", orgSlug);

  function next() {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isAdminRoute) {
    if (!hasAdminSession && !isAdminLogin) {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_LOGIN;
      return NextResponse.redirect(url);
    }
    if (hasAdminSession && isAdminLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return next();
  }

  if (!hasFrontSession && !isFrontendLogin) {
    const url = request.nextUrl.clone();
    url.pathname = FRONTEND_LOGIN;
    return NextResponse.redirect(url);
  }
  if (hasFrontSession && isFrontendLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|gif|ico|webp)$).*)",
  ],
};
