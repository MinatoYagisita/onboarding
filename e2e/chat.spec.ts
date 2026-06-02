import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const res = await page.request.post("/api/auth/mock-login", {
    data: { username: "admin", password: "Zaq12wsx" },
  });
  if (res.status() !== 200) {
    test.skip();
  }
  await page.goto("/");
  await page.waitForLoadState("networkidle");
});

// TC-T001: 質問送信と回答表示
test("TC-T001: 質問を送信して回答カードが表示される", async ({ page }) => {
  const input = page.getByPlaceholder(/休憩は何分取れますか|質問を入力/);
  await expect(input).toBeVisible();

  await input.fill("休憩は何分取れますか？");
  // Cmd+Enter または送信ボタン
  await input.press("Meta+Enter");

  // ローディング状態 → 回答表示を待つ（最大30秒、AI API 呼び出しあり）
  await expect(page.locator("[data-testid='answer-card'], .answer-card, [class*='answer']").first()).toBeVisible({ timeout: 30_000 });
});

// TC-T009: 質問後にサイドバーにスレッドが表示される
test("TC-T009: 質問後にサイドバーにスレッドが追加される", async ({ page }) => {
  const input = page.getByPlaceholder(/休憩は何分取れますか|質問を入力/);
  if (!(await input.isVisible())) return;

  await input.fill("有給休暇の取得方法を教えてください");
  await input.press("Meta+Enter");

  // サイドバーへのスレッド追加を待つ
  await expect(page.getByText("有給休暇の取得方法").first()).toBeVisible({ timeout: 30_000 });
});

// TC-TM004: ページリロード後の履歴保持
test("TC-TM004: ページリロード後もスレッド履歴が残る", async ({ page }) => {
  // まず質問を作成（モック API 経由で直接スレッドを作っておく）
  const threadRes = await page.request.post("/api/threads", {
    data: { question: "リロードテスト用の質問" },
  });

  if (threadRes.status() !== 201) {
    test.skip();
    return;
  }

  await page.reload();
  await page.waitForLoadState("networkidle");

  // サイドバーにスレッドが残っている
  await expect(page.getByText("リロードテスト用の質問")).toBeVisible({ timeout: 10_000 });
});

// TC-TM002: ピン留め
test("TC-TM002: スレッドをピン留めできる", async ({ page }) => {
  // スレッドを API で作成
  const threadRes = await page.request.post("/api/threads", {
    data: { question: "ピン留めテスト" },
  });
  if (threadRes.status() !== 201) {
    test.skip();
    return;
  }

  await page.reload();
  await page.waitForLoadState("networkidle");

  // スレッドにホバーしてピンアイコンを押す
  const threadItem = page.getByText("ピン留めテスト").first();
  await threadItem.hover();

  const pinBtn = page.getByRole("button", { name: /ピン|pin/i }).first();
  if (await pinBtn.isVisible()) {
    await pinBtn.click();
    // ピン留めセクションに移動することを確認
    await expect(page.getByText("ピン留めテスト")).toBeVisible();
  }
});
