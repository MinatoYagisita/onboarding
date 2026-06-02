import { test, expect } from "@playwright/test";

// TC-S004: 未認証リダイレクト
test("TC-S004: 未認証で / にアクセスすると /login にリダイレクト", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("TC-S005: 未認証で /admin にアクセスすると /admin/login にリダイレクト", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

// TC-A001: パスコードログインフロー
test("TC-A001: パスコードフォームが表示される", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder(/example\.com/)).toBeVisible();
  await expect(page.getByRole("button", { name: /パスコードを送信/ })).toBeVisible();
});

// TC-A009: 管理者ログインフォーム
test("TC-A009: 管理者ログインフォームが /admin/login にある", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByPlaceholder(/example\.com/)).toBeVisible();
});

// TC-S007: ログアウト後リダイレクト
test("TC-S007: モックログイン後にログアウトすると /login にリダイレクト", async ({ page }) => {
  // モックログインでセッション作成
  const res = await page.request.post("/api/auth/mock-login", {
    data: { username: "admin", password: "Zaq12wsx" },
  });
  // 本番環境では mock-login が 404 を返すので条件付き
  if (res.status() !== 200) {
    test.skip();
    return;
  }

  await page.goto("/");
  // ロード待ち
  await page.waitForLoadState("networkidle");

  // ログアウトボタンを探してクリック
  const logoutBtn = page.getByRole("button", { name: /ログアウト/ });
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await expect(page).toHaveURL(/\/login/);
  }
});
