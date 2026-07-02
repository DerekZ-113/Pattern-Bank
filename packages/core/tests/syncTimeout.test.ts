import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SyncTimeoutError, isLikelyOfflineError, isSyncTimeoutError, withTimeout } from "../src/syncTimeout";

describe("withTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves when the operation finishes before the timeout", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000, "fast op")).resolves.toBe("ok");
  });

  it("rejects with the original error when the operation fails before the timeout", async () => {
    const error = new Error("boom");
    await expect(withTimeout(Promise.reject(error), 1000, "failing op")).rejects.toBe(error);
  });

  it("rejects with a typed timeout error when the operation hangs", async () => {
    const result = withTimeout(new Promise(() => undefined), 1000, "slow op");

    vi.advanceTimersByTime(1000);

    await expect(result).rejects.toMatchObject({
      name: "SyncTimeoutError",
      operation: "slow op",
      timeoutMs: 1000,
    });
    await expect(result).rejects.toBeInstanceOf(SyncTimeoutError);
  });
});

describe("error classification", () => {
  it("recognizes SyncTimeoutError instances and shape-alikes", () => {
    expect(isSyncTimeoutError(new SyncTimeoutError("op", 100))).toBe(true);
    expect(isSyncTimeoutError({ name: "SyncTimeoutError" })).toBe(true);
    expect(isSyncTimeoutError(new Error("other"))).toBe(false);
    expect(isSyncTimeoutError(null)).toBe(false);
  });

  it("treats timeouts and network-ish messages as likely offline", () => {
    expect(isLikelyOfflineError(new SyncTimeoutError("op", 100))).toBe(true);
    expect(isLikelyOfflineError(new Error("Network request failed"))).toBe(true);
    expect(isLikelyOfflineError(new Error("fetch failed"))).toBe(true);
    expect(isLikelyOfflineError(new Error("row not found"))).toBe(false);
  });
});
