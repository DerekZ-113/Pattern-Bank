import { timestampMs } from "./dateHelpers";
import type { CloudPreferences } from "./supabase/mapping";
import type { CorePreferences } from "./types";

function stringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

/** Compares only the cloud-synced content fields — platform extras (and `updatedAt`) are ignored. */
export function preferencesEqual(
  a: Pick<CorePreferences, "dailyReviewGoal" | "hidePatternsDuringReview" | "enabledExtraPatterns">,
  b: Pick<CorePreferences, "dailyReviewGoal" | "hidePatternsDuringReview" | "enabledExtraPatterns">,
): boolean {
  return (
    a.dailyReviewGoal === b.dailyReviewGoal &&
    a.hidePatternsDuringReview === b.hidePatternsDuringReview &&
    stringArraysEqual(a.enabledExtraPatterns, b.enabledExtraPatterns)
  );
}

export interface MergePreferencesResult<P extends CorePreferences> {
  preferences: P;
  winner: "local" | "cloud";
}

/**
 * Newest-wins preference merge (F-6). Blobs persisted before `updatedAt`
 * existed get the epoch shim — anything stamped beats them, and two unstamped
 * blobs preserve the legacy cloud-wins behavior (ties go to cloud). Platform
 * extras on the local blob (e.g. mobile notification fields) always survive;
 * only the cloud-synced subset is overwritten when cloud wins.
 */
export function mergePreferences<P extends CorePreferences>(
  local: P,
  cloud: CloudPreferences | null,
): MergePreferencesResult<P> {
  if (!cloud) return { preferences: local, winner: "local" };
  if (timestampMs(local.updatedAt) > timestampMs(cloud.updatedAt)) {
    return { preferences: local, winner: "local" };
  }
  const preferences: P = {
    ...local,
    dailyReviewGoal: cloud.dailyReviewGoal,
    hidePatternsDuringReview: cloud.hidePatternsDuringReview,
    enabledExtraPatterns: cloud.enabledExtraPatterns,
  };
  if (cloud.updatedAt !== undefined) {
    preferences.updatedAt = cloud.updatedAt;
  }
  return { preferences, winner: "cloud" };
}
