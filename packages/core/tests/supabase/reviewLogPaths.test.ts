import { asClient, createSupabaseMock, type SupabaseMock } from "../helpers/supabaseMock";
import { createCloudData, type CloudData } from "../../src/supabase/data";
import type { ReviewEvent } from "../../src/types";

// ============================================================
// Module-level mock variable — controlled per-test (same pattern
// as packages/core/tests/supabase/data.test.ts)
// ============================================================

let mockSupabase: SupabaseMock | null = null;

function cloud(): CloudData {
  return createCloudData({ supabase: asClient(mockSupabase) });
}

const USER_ID = "user-abc";

/** Row captured from the mocked client, whichever write verb was used. */
function capturedWriteRow(mock: SupabaseMock): Record<string, unknown> {
  const call = mock.upsert.mock.calls[0] ?? mock.insert.mock.calls[0];
  expect(call).toBeDefined();
  return call![0] as Record<string, unknown>;
}

beforeEach(() => {
  mockSupabase = null;
  vi.useRealTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ============================================================
// logReview — review_date derivation near local midnight
// ============================================================

describe("logReview review_date derivation (local-date contract)", () => {
  // Timestamps are built with the LOCAL Date constructor so the test is
  // timezone-portable: whatever timezone vitest runs in (UTC in CI,
  // US/Pacific on dev machines), both moments fall on LOCAL date 2026-05-15,
  // while their UTC ISO representation may fall on 2026-05-14 or 2026-05-16.
  const localMorningIso = new Date(2026, 4, 15, 0, 30, 0).toISOString();
  const localNightIso = new Date(2026, 4, 15, 23, 30, 0).toISOString();

  it("writes review_date as the LOCAL calendar date for a timestamp just after local midnight", async () => {
    mockSupabase = createSupabaseMock({ data: null, error: null });

    const result = await cloud().logReview(USER_ID, "prob-1", 2, 3, ["Hash Table"], localMorningIso);

    expect(result.error).toBeNull();
    const row = capturedWriteRow(mockSupabase);
    expect(row.review_date).toBe("2026-05-15");
    expect(row.created_at).toBe(localMorningIso);
  });

  it("writes review_date as the LOCAL calendar date for a timestamp just before local midnight", async () => {
    mockSupabase = createSupabaseMock({ data: null, error: null });

    const result = await cloud().logReview(USER_ID, "prob-1", 2, 4, ["Graph"], localNightIso);

    expect(result.error).toBeNull();
    const row = capturedWriteRow(mockSupabase);
    expect(row.review_date).toBe("2026-05-15");
    expect(row.created_at).toBe(localNightIso);
  });

  it("uses the local date, NOT the UTC date slice, when they differ (non-UTC runtimes)", async () => {
    // In a UTC runtime (CI) local == UTC and the boundary cannot be crossed;
    // this test only proves the distinction on machines with a real offset.
    const offsetMinutes = new Date(2026, 4, 15, 12, 0, 0).getTimezoneOffset();
    if (offsetMinutes === 0) return; // UTC runtime — nothing to distinguish

    // With any offset > 30 minutes, at least one of the two near-midnight
    // moments has a UTC ISO string on a different calendar date.
    const utcSlices = [localMorningIso.slice(0, 10), localNightIso.slice(0, 10)];
    if (Math.abs(offsetMinutes) > 30) {
      expect(utcSlices.some((slice) => slice !== "2026-05-15")).toBe(true);
    }

    for (const iso of [localMorningIso, localNightIso]) {
      mockSupabase = createSupabaseMock({ data: null, error: null });
      await cloud().logReview(USER_ID, "prob-1", 2, 3, [], iso);
      const row = capturedWriteRow(mockSupabase);
      // Local calendar date wins even when the UTC slice says otherwise
      expect(row.review_date).toBe("2026-05-15");
    }
  });

  it("defaults review_date to today's local date when no timestamp is given", async () => {
    vi.useFakeTimers();
    // Local 23:30 — in west-of-UTC timezones the UTC date is already tomorrow
    vi.setSystemTime(new Date(2026, 4, 15, 23, 30, 0));
    mockSupabase = createSupabaseMock({ data: null, error: null });

    const result = await cloud().logReview(USER_ID, "prob-1", 1, 2, []);

    expect(result.error).toBeNull();
    const row = capturedWriteRow(mockSupabase);
    expect(row.review_date).toBe("2026-05-15");
  });
});

// ============================================================
// logReview — dedupe_key (canonical mobile contract, F-8 —
// landed in Phase 4 via core's createCloudData)
// ============================================================

describe("logReview dedupe_key", () => {
  // Canonical contract:
  //   reviewDedupeKey = `review:${userId}:${problemId}:${timestamp}`
  //   written via .upsert(row, { onConflict: "dedupe_key" })

  it("writes a dedupe_key matching mobile's review:<userId>:<problemId>:<timestamp> format", async () => {
    mockSupabase = createSupabaseMock({ data: null, error: null });
    const timestamp = "2026-03-10T12:00:00.000Z";

    await cloud().logReview(USER_ID, "prob-1", 2, 3, ["Two Pointers"], timestamp);

    const row = capturedWriteRow(mockSupabase);
    expect(row.dedupe_key).toBe(`review:${USER_ID}:prob-1:${timestamp}`);
  });

  it("upserts on dedupe_key conflict instead of plain-inserting", async () => {
    mockSupabase = createSupabaseMock({ data: null, error: null });

    await cloud().logReview(USER_ID, "prob-1", 2, 3, [], "2026-03-10T12:00:00.000Z");

    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID, problem_id: "prob-1" }),
      { onConflict: "dedupe_key" },
    );
  });
});

// ============================================================
// batchInsertReviewLogs — partial-chunk failure
// ============================================================

describe("batchInsertReviewLogs partial-chunk failure", () => {
  function makeEvent(index: number): ReviewEvent {
    return {
      date: "2026-03-10",
      problemId: `prob-${index}`,
      confidence: 3,
      patterns: ["Hash Table"],
      timestamp: `2026-03-10T12:00:${String(index % 60).padStart(2, "0")}.000Z`,
    };
  }

  /**
   * Queue per-chunk results on BOTH write verbs so the contract survives an
   * insert→upsert migration; captures each chunk's rows as they are written.
   */
  function queueChunkResults(mock: SupabaseMock, results: Array<{ error: unknown }>) {
    const queue = [...results];
    const chunks: unknown[][] = [];
    const respond = (rows: unknown) => {
      chunks.push(rows as unknown[]);
      return Promise.resolve(queue.shift() ?? { data: null, error: null });
    };
    mock.insert.mockImplementation(respond);
    mock.upsert.mockImplementation(respond);
    return chunks;
  }

  it("returns { error: null } when events is empty without touching the client", async () => {
    mockSupabase = createSupabaseMock({});
    const result = await cloud().batchInsertReviewLogs(USER_ID, []);
    expect(result).toEqual({ error: null });
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("writes every batched row with the deterministic review dedupe key (F-8)", async () => {
    mockSupabase = createSupabaseMock({});
    const chunks = queueChunkResults(mockSupabase, [{ error: null }]);

    const result = await cloud().batchInsertReviewLogs(USER_ID, [makeEvent(0), makeEvent(1)]);

    expect(result.error).toBeNull();
    expect(chunks[0][0]).toMatchObject({
      problem_id: "prob-0",
      dedupe_key: `review:${USER_ID}:prob-0:2026-03-10T12:00:00.000Z`,
    });
    expect(chunks[0][1]).toMatchObject({
      problem_id: "prob-1",
      dedupe_key: `review:${USER_ID}:prob-1:2026-03-10T12:00:01.000Z`,
    });
    expect(mockSupabase.upsert).toHaveBeenCalledWith(expect.anything(), { onConflict: "dedupe_key" });
  });

  it("surfaces the error when the second chunk fails — no silent full-success claim", async () => {
    const chunkError = { message: "chunk 2 insert failed" };
    mockSupabase = createSupabaseMock({});
    const chunks = queueChunkResults(mockSupabase, [{ error: null }, { error: chunkError }]);

    // 501 events → two chunks of 500 + 1
    const events = Array.from({ length: 501 }, (_, i) => makeEvent(i));
    const result = await cloud().batchInsertReviewLogs(USER_ID, events);

    // The failure MUST be surfaced to the caller (fail-closed), not swallowed
    expect(result.error).toBe(chunkError);
    // And the return value must not claim full success
    expect(result.error).not.toBeNull();

    // Both chunks were attempted, in order, with the expected sizes
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(1);
    expect((chunks[0][0] as Record<string, unknown>).problem_id).toBe("prob-0");
    expect((chunks[1][0] as Record<string, unknown>).problem_id).toBe("prob-500");
  });

  it("stops after a first-chunk failure and surfaces that error", async () => {
    const chunkError = { message: "chunk 1 insert failed" };
    mockSupabase = createSupabaseMock({});
    const chunks = queueChunkResults(mockSupabase, [{ error: chunkError }]);

    const events = Array.from({ length: 501 }, (_, i) => makeEvent(i));
    const result = await cloud().batchInsertReviewLogs(USER_ID, events);

    expect(result.error).toBe(chunkError);
    // Second chunk is never attempted once the first has failed
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(500);
  });

  it("returns { error: null } only when every chunk succeeds", async () => {
    mockSupabase = createSupabaseMock({});
    const chunks = queueChunkResults(mockSupabase, [{ error: null }, { error: null }]);

    const events = Array.from({ length: 501 }, (_, i) => makeEvent(i));
    const result = await cloud().batchInsertReviewLogs(USER_ID, events);

    expect(result.error).toBeNull();
    expect(chunks).toHaveLength(2);
    // Rows carry the snake_case review fields through unchanged
    expect(chunks[0][0]).toMatchObject({
      user_id: USER_ID,
      problem_id: "prob-0",
      new_confidence: 3,
      review_date: "2026-03-10",
      created_at: "2026-03-10T12:00:00.000Z",
    });
  });
});
