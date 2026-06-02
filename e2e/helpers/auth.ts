import type { Page } from "@playwright/test";

/** モックログイン API でセッションを作成する（開発環境専用） */
export async function mockLogin(page: Page, role: "member" | "admin" = "member") {
  await page.request.post("/api/auth/mock-login", {
    data: { username: "admin", password: "Zaq12wsx", role },
  });
}

/** パスコード認証フローでログインする */
export async function passcodeLogin(page: Page, email: string) {
  await page.goto("/login");
  await page.getByPlaceholder(/メールアドレス/).fill(email);
  await page.getByRole("button", { name: /パスコードを送信/ }).click();
  await page.waitForSelector("[data-testid='passcode-input'], input[maxlength='6'], input[placeholder*='コード']");
}

/** 管理画面用モックログイン */
export async function adminMockLogin(page: Page) {
  await page.request.post("/api/auth/mock-login", {
    data: { username: "admin", password: "Zaq12wsx" },
  });
  // セッション確立後に管理画面に移動
  await page.goto("/admin");
}
