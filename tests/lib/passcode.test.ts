import { describe, it, expect } from "vitest";
import { generateCode, hashCode, verifyCode, passcodeExpiresAt, PASSCODE_TTL_SEC } from "@/lib/passcode";

describe("generateCode", () => {
  it("6桁の数字文字列を返す", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("TC-BG005: 生成される値は 6 桁の範囲内（100000〜999999）に収まる", () => {
    for (let i = 0; i < 500; i++) {
      const n = Number(generateCode());
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });
});

describe("hashCode / verifyCode", () => {
  it("TC-P003: hashCode は salt:hash 形式の文字列を返す", async () => {
    const hash = await hashCode("123456");
    expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it("TC-P004: 同じコードを2回ハッシュすると異なる値（ソルト）になる", async () => {
    const h1 = await hashCode("123456");
    const h2 = await hashCode("123456");
    expect(h1).not.toBe(h2);
  });

  it("TC-P005: verifyCode は正しいコードで true を返す", async () => {
    const hash = await hashCode("123456");
    expect(await verifyCode("123456", hash)).toBe(true);
  });

  it("TC-P006: verifyCode は誤ったコードで false を返す", async () => {
    const hash = await hashCode("123456");
    expect(await verifyCode("999999", hash)).toBe(false);
  });

  it("TC-P007: verifyCode は不正なハッシュ形式で false を返す", async () => {
    expect(await verifyCode("123456", "malformed")).toBe(false);
    expect(await verifyCode("123456", "")).toBe(false);
  });
});

describe("passcodeExpiresAt", () => {
  it("現在から PASSCODE_TTL_SEC 秒後を返す", () => {
    const before = Date.now();
    const expiresAt = passcodeExpiresAt();
    const after = Date.now();

    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + PASSCODE_TTL_SEC * 1000 - 10);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + PASSCODE_TTL_SEC * 1000 + 10);
  });
});
