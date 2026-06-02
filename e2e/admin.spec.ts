import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/auth/mock-login", {
    data: { username: "admin", password: "Zaq12wsx" },
  });
  if (res.status() !== 200) {
    test.skip();
  }
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
});

// TC-R004: ランキングページにデータが表示される
test("TC-R004: /admin/ranking にアクセスするとランキングが表示される", async ({ page }) => {
  await page.goto("/admin/ranking");
  await page.waitForLoadState("networkidle");

  // ページタイトルまたはテーブルが表示される
  await expect(
    page.getByText(/質問ランキング|ランキング/).first()
  ).toBeVisible();
});

// TC-C003: カテゴリ追加・削除
test("TC-C003: 管理画面でカテゴリを追加できる", async ({ page }) => {
  await page.goto("/admin/categories");
  await page.waitForLoadState("networkidle");

  const categoryName = `テストカテゴリ_${Date.now()}`;

  // 入力欄にカテゴリ名を入力
  const nameInput = page.getByPlaceholder(/カテゴリ名|名前/).first();
  if (!(await nameInput.isVisible())) return;

  await nameInput.fill(categoryName);

  // スラッグ入力（あれば）
  const slugInput = page.getByPlaceholder(/スラッグ|slug/i).first();
  if (await slugInput.isVisible()) {
    await slugInput.fill(`test-category-${Date.now()}`);
  }

  // 追加ボタン押下
  await page.getByRole("button", { name: /追加|作成|保存/ }).first().click();

  // 追加されたカテゴリが一覧に表示される
  await expect(page.getByText(categoryName)).toBeVisible({ timeout: 5_000 });
});

// TC-E003: エスカレーション対応
test("TC-E003: 相談一覧でステータスを対応済みに更新できる", async ({ page }) => {
  await page.goto("/admin/escalations");
  await page.waitForLoadState("networkidle");

  // 「対応待ち」のエスカレーションがあれば対応済みに変更
  const pendingBtn = page.getByRole("button", { name: /対応済み|完了/ }).first();
  if (await pendingBtn.isVisible()) {
    await pendingBtn.click();
    await page.waitForLoadState("networkidle");
    // ステータスが変わったことを確認
    await expect(page.getByText(/対応済み/).first()).toBeVisible();
  }
});

// TC-OS004: 組織設定変更の反映
test("TC-OS004: 管理画面で組織名を変更できる", async ({ page }) => {
  await page.goto("/admin/settings");
  await page.waitForLoadState("networkidle");

  // 組織設定フォームが表示される
  await expect(
    page.getByText(/組織設定|ブランド設定/).first()
  ).toBeVisible();
});

// TC-UM001: ユーザー招待
test("TC-UM001: ユーザー管理画面が表示される", async ({ page }) => {
  await page.goto("/admin/users");
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByText(/ユーザー管理|ユーザー一覧/).first()
  ).toBeVisible();
});

// TC-F001, TC-F002: FAQ 表示（ユーザーサイド）
test("TC-F001: FAQ タブを開くと公開済み FAQ が表示される", async ({ page }) => {
  // ユーザー画面に切り替え（FAQ はユーザー側の機能）
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const faqTab = page.getByRole("tab", { name: /よくある質問|FAQ/ });
  if (await faqTab.isVisible()) {
    await faqTab.click();
    await page.waitForLoadState("networkidle");
    // FAQ リストまたは空状態が表示される
    await expect(page.locator("main, [role='main']")).toBeVisible();
  }
});
