// F-6 acceptance: preferences follow newest-wins with an epoch shim for
// legacy unstamped blobs. Runs against core's mergePreferences and the real
// performFullSync with an injected mock cloud (node env, no module mocking).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mergePreferences, preferencesEqual } from "../src/preferences";
import { performFullSync, type FullSyncDeps } from "../src/sync/fullSync";
import type { CorePreferences } from "../src/types";
import {
  MemoryStorage,
  createMockCloud,
  makePreferences,
  type MockCloud,
} from "./helpers/syncTestUtils";

const USER_ID = "user-prefs";

let cloud: MockCloud;
let storage: MemoryStorage;

beforeEach(() => {
  cloud = createMockCloud();
  storage = new MemoryStorage();
});

function deps(preferences: CorePreferences): FullSyncDeps<CorePreferences> {
  return {
    userId: USER_ID,
    cloud,
    storage,
    local: {
      problems: [],
      reviewLog: [],
      reviewEvents: [],
      preferences,
      problemTombstones: [],
      dataReset: null,
    },
    eventRetentionDays: null,
    hooks: { warn: vi.fn() },
  };
}

describe("preferences round-trip on sign-in (F-6)", () => {
  // Scenario: the user changed preferences while SIGNED OUT (the local blob
  // was stamped after the last cloud write), then signs back in. Newest wins:
  // the local signed-out change must survive sync AND propagate to the cloud
  // so other devices converge.
  it("keeps a local signed-out preferences change over an older cloud snapshot", async () => {
    const staleCloudPrefs = makePreferences({
      dailyReviewGoal: 5,
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
    const newerLocalPrefs = makePreferences({
      dailyReviewGoal: 8,
      hidePatternsDuringReview: true,
      enabledExtraPatterns: ["Sliding Window"],
      updatedAt: "2026-03-10T00:00:00.000Z",
    });
    cloud.fetchPreferences.mockResolvedValue({ data: staleCloudPrefs, error: null });

    const result = await performFullSync(deps(newerLocalPrefs));

    expect(result.status).toBe("success");
    if (result.status === "success") {
      // The persisted preferences object must be the newer local edit.
      expect(result.preferences).toEqual(newerLocalPrefs);
    }
    // And it must be pushed so the stale cloud snapshot is repaired.
    expect(cloud.upsertPreferences).toHaveBeenCalledWith(USER_ID, newerLocalPrefs);
  });

  it("uses cloud preferences when cloud is genuinely newer (control)", async () => {
    // Here the cloud snapshot IS the most recent write (e.g. edited on another
    // device after this device last synced) — cloud winning is correct.
    const staleLocalPrefs = makePreferences({
      dailyReviewGoal: 5,
      updatedAt: "2026-03-01T00:00:00.000Z",
    });
    const newerCloudPrefs = makePreferences({
      dailyReviewGoal: 12,
      hidePatternsDuringReview: true,
      enabledExtraPatterns: ["Monotonic Stack"],
      updatedAt: "2026-03-10T00:00:00.000Z",
    });
    cloud.fetchPreferences.mockResolvedValue({ data: newerCloudPrefs, error: null });

    const result = await performFullSync(deps(staleLocalPrefs));

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.preferences).toEqual(newerCloudPrefs);
      expect(result.hasChanges).toBe(true);
    }
    // Cloud already had the newest prefs — nothing should be pushed back.
    expect(cloud.upsertPreferences).not.toHaveBeenCalled();
  });

  it("preserves legacy cloud-wins when neither blob is stamped (epoch shim tie)", async () => {
    const unstampedLocal = makePreferences({ dailyReviewGoal: 8 });
    const unstampedCloud = makePreferences({ dailyReviewGoal: 5 });
    cloud.fetchPreferences.mockResolvedValue({ data: unstampedCloud, error: null });

    const result = await performFullSync(deps(unstampedLocal));

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.preferences).toEqual(unstampedCloud);
    }
    expect(cloud.upsertPreferences).not.toHaveBeenCalled();
  });

  it("pushes local preferences to cloud on first sign-in (no cloud prefs)", async () => {
    const localPrefs = makePreferences({ dailyReviewGoal: 7 });
    cloud.fetchPreferences.mockResolvedValue({ data: null, error: null });

    const result = await performFullSync(deps(localPrefs));

    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.preferences).toEqual(localPrefs);
    }
    expect(cloud.upsertPreferences).toHaveBeenCalledWith(USER_ID, localPrefs);
  });
});

describe("mergePreferences — newest-wins with the epoch shim (F-6)", () => {
  it("local wins when stamped newer than cloud", () => {
    const local = makePreferences({ dailyReviewGoal: 8, updatedAt: "2026-03-10T00:00:00.000Z" });
    const cloudPrefs = makePreferences({ dailyReviewGoal: 5, updatedAt: "2026-03-01T00:00:00.000Z" });
    const { preferences, winner } = mergePreferences(local, cloudPrefs);
    expect(winner).toBe("local");
    expect(preferences).toEqual(local);
  });

  it("cloud wins when stamped newer than local", () => {
    const local = makePreferences({ dailyReviewGoal: 8, updatedAt: "2026-03-01T00:00:00.000Z" });
    const cloudPrefs = makePreferences({ dailyReviewGoal: 5, updatedAt: "2026-03-10T00:00:00.000Z" });
    const { preferences, winner } = mergePreferences(local, cloudPrefs);
    expect(winner).toBe("cloud");
    expect(preferences).toEqual(cloudPrefs);
  });

  it("anything stamped beats an unstamped blob (local stamped)", () => {
    const local = makePreferences({ dailyReviewGoal: 8, updatedAt: "2026-03-10T00:00:00.000Z" });
    const cloudPrefs = makePreferences({ dailyReviewGoal: 5 });
    expect(mergePreferences(local, cloudPrefs).winner).toBe("local");
  });

  it("anything stamped beats an unstamped blob (cloud stamped)", () => {
    const local = makePreferences({ dailyReviewGoal: 8 });
    const cloudPrefs = makePreferences({ dailyReviewGoal: 5, updatedAt: "2026-03-10T00:00:00.000Z" });
    const merged = mergePreferences(local, cloudPrefs);
    expect(merged.winner).toBe("cloud");
    expect(merged.preferences.updatedAt).toBe("2026-03-10T00:00:00.000Z");
  });

  it("two unstamped blobs → cloud wins (legacy behavior preserved for existing users)", () => {
    const local = makePreferences({ dailyReviewGoal: 8 });
    const cloudPrefs = makePreferences({ dailyReviewGoal: 5 });
    const merged = mergePreferences(local, cloudPrefs);
    expect(merged.winner).toBe("cloud");
    expect(merged.preferences.dailyReviewGoal).toBe(5);
  });

  it("null cloud → local wins (first sign-in)", () => {
    const local = makePreferences({ dailyReviewGoal: 8 });
    const merged = mergePreferences(local, null);
    expect(merged.winner).toBe("local");
    expect(merged.preferences).toEqual(local);
  });

  it("platform-only fields on the local blob survive a cloud win", () => {
    const local = { ...makePreferences({ dailyReviewGoal: 8 }), notificationsEnabled: true, reminderHour: 9 };
    const cloudPrefs = makePreferences({
      dailyReviewGoal: 5,
      enabledExtraPatterns: ["Intervals"],
      updatedAt: "2026-03-10T00:00:00.000Z",
    });
    const { preferences, winner } = mergePreferences(local, cloudPrefs);
    expect(winner).toBe("cloud");
    expect(preferences.dailyReviewGoal).toBe(5);
    expect(preferences.enabledExtraPatterns).toEqual(["Intervals"]);
    expect(preferences.notificationsEnabled).toBe(true);
    expect(preferences.reminderHour).toBe(9);
  });

  it("preferencesEqual compares only the cloud-synced content fields", () => {
    const a = makePreferences({ updatedAt: "2026-03-01T00:00:00.000Z" });
    const b = makePreferences({ updatedAt: "2026-03-10T00:00:00.000Z" });
    expect(preferencesEqual(a, b)).toBe(true);
    expect(preferencesEqual(a, makePreferences({ dailyReviewGoal: 99 }))).toBe(false);
    expect(preferencesEqual(a, makePreferences({ hidePatternsDuringReview: true }))).toBe(false);
    expect(preferencesEqual(a, makePreferences({ enabledExtraPatterns: ["Bit"] }))).toBe(false);
  });
});
