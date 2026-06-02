"use client";

function isAdminPath(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    const loginPath = isAdminPath() ? "/admin/login" : "/login";
    window.location.href = loginPath;
    return new Promise(() => {});
  }
  return res;
}
