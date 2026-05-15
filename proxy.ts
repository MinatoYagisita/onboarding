import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/authShared";

// Proxy (Next.js 16 で middleware の後継) で、未認証アクセスを /login 系に集約する。
// 実際の認可はページ／レイアウト側で行う前提（Proxy は optimistic check）。

const FRONTEND_LOGIN = "/login";
const ADMIN_LOGIN = "/admin/login";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasFrontSession = Boolean(request.cookies.get(SESSION_COOKIE));
  const hasAdminSession = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE));

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminLogin =
    pathname === ADMIN_LOGIN || pathname.startsWith(`${ADMIN_LOGIN}/`);
  const isFrontendLogin =
    pathname === FRONTEND_LOGIN || pathname.startsWith(`${FRONTEND_LOGIN}/`);

  if (isAdminRoute) {
    // 管理画面は admin cookie 必須。/admin/login のみ例外。
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
    return NextResponse.next();
  }

  // ユーザーフロント側
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 静的アセットと Next 内部パスは除外する。
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|gif|ico|webp)$).*)",
  ],
};
