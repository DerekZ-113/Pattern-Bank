/**
 * Shared fixtures for the core sync suites: factories, an in-memory
 * StorageAdapter that records writes, and a fully mocked cloud surface with
 * green defaults. Node-env only — no localStorage, no module mocking.
 */
import type { Mock } from "vitest";
import type { StorageAdapter } from "../../src/storage/adapter";
import type { FullSyncCloud } from "../../src/sync/fullSync";
import type {
  CorePreferences,
  Problem,
  ReviewEvent,
  ReviewLogEntry,
} from "../../src/types";

export function makeProblem(overrides: Partial<Problem> = {}): Problem {
  return {
    id: `id-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Problem",
    leetcodeNumber: null,
    url: null,
    difficulty: "Medium",
    patterns: [],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: "2026-03-01",
    lastReviewed: null,
    nextReviewDate: "2026-03-02",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...overrides,
  };
}

export function makeEntry(date: string): ReviewLogEntry {
  return { date };
}

export function makeEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    date: "2026-03-10",
    problemId: "prob-1",
    confidence: 3,
    patterns: ["Hash Table"],
    timestamp: "2026-03-10T12:00:00.000Z",
    ...overrides,
  };
}

export function makePreferences(overrides: Partial<CorePreferences> = {}): CorePreferences {
  return {
    dailyReviewGoal: 5,
    hidePatternsDuringReview: false,
    enabledExtraPatterns: [],
    ...overrides,
  };
}

/** In-memory StorageAdapter that records every write for no-partial-write assertions. */
export class MemoryStorage implements StorageAdapter {
  private readonly map = new Map<string, string>();
  readonly setItemCalls: Array<{ key: string; value: string }> = [];
  readonly removeItemCalls: string[] = [];

  getItem(key: string): Promise<string | null> {
    return Promise.resolve(this.map.get(key) ?? null);
  }

  setItem(key: string, value: string): Promise<void> {
    this.setItemCalls.push({ key, value });
    this.map.set(key, value);
    return Promise.resolve();
  }

  removeItem(key: string): Promise<void> {
    this.removeItemCalls.push(key);
    this.map.delete(key);
    return Promise.resolve();
  }

  get writeCount(): number {
    return this.setItemCalls.length + this.removeItemCalls.length;
  }
}

export type MockCloud = { [K in keyof FullSyncCloud]: Mock<FullSyncCloud[K]> };

/** Every cloud call mocked green: empty data, no errors. Override per test. */
export function createMockCloud(): MockCloud {
  return {
    fetchProblems: vi.fn<FullSyncCloud["fetchProblems"]>().mockResolvedValue({ data: [], error: null }),
    fetchProblemTombstones: vi.fn<FullSyncCloud["fetchProblemTombstones"]>().mockResolvedValue({ data: [], error: null }),
    fetchDataReset: vi.fn<FullSyncCloud["fetchDataReset"]>().mockResolvedValue({ data: null, error: null }),
    fetchReviewLog: vi.fn<FullSyncCloud["fetchReviewLog"]>().mockResolvedValue({ data: [], error: null }),
    fetchReviewEvents: vi.fn<FullSyncCloud["fetchReviewEvents"]>().mockResolvedValue({ data: [], error: null }),
    fetchPreferences: vi.fn<FullSyncCloud["fetchPreferences"]>().mockResolvedValue({ data: null, error: null }),
    upsertDataReset: vi.fn<FullSyncCloud["upsertDataReset"]>().mockResolvedValue({ error: null }),
    deleteAllUserProblems: vi.fn<FullSyncCloud["deleteAllUserProblems"]>().mockResolvedValue({ error: null }),
    deleteAllUserReviewLog: vi.fn<FullSyncCloud["deleteAllUserReviewLog"]>().mockResolvedValue({ error: null }),
    upsertProblemTombstones: vi.fn<FullSyncCloud["upsertProblemTombstones"]>().mockResolvedValue({ error: null }),
    deleteProblems: vi.fn<FullSyncCloud["deleteProblems"]>().mockResolvedValue({ error: null }),
    upsertProblems: vi.fn<FullSyncCloud["upsertProblems"]>().mockResolvedValue({ data: [], error: null }),
    batchInsertReviewLogs: vi.fn<FullSyncCloud["batchInsertReviewLogs"]>().mockResolvedValue({ error: null }),
    upsertPreferences: vi.fn<FullSyncCloud["upsertPreferences"]>().mockResolvedValue({ data: null, error: null }),
  };
}
