import { vi } from "vitest";

// Next.js globals that aren't available in Vitest's node environment
if (!globalThis.crypto) {
  const { webcrypto } = await import("crypto");
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

// Silence logger in tests
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));
