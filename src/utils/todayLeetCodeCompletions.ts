import { todayStr } from "./dateHelpers";
import type { LeetCodeSubmission } from "../types";

export type TodayLeetCodeCompletionAction = "imported" | "linked_existing" | "rated";

export interface LeetCodeCompletionIdentity {
  submissionDbId?: string | null;
  leetcodeSubmissionId?: string | null;
  titleSlug?: string | null;
  leetcodeNumber?: number | null;
  problemId?: string | null;
}

export interface TodayLeetCodeCompletion extends Required<Pick<LeetCodeCompletionIdentity, "submissionDbId">> {
  key: string;
  date: string;
  leetcodeSubmissionId: string | null;
  titleSlug: string | null;
  leetcodeNumber: number | null;
  problemId: string;
  action: TodayLeetCodeCompletionAction;
  completedAt: string;
}

const STORAGE_KEY_PREFIX = "patternbank-today-leetcode-completions";

export function buildTodayLeetCodeCompletionsStorageKey(today = todayStr()): string {
  return `${STORAGE_KEY_PREFIX}:${today}`;
}

export function buildLeetCodeCompletionKey(identity: LeetCodeCompletionIdentity): string {
  const titleSlug = identity.titleSlug?.trim();
  if (titleSlug) return `slug:${titleSlug}`;
  if (typeof identity.leetcodeNumber === "number") return `number:${identity.leetcodeNumber}`;
  if (identity.problemId) return `problem:${identity.problemId}`;
  if (identity.leetcodeSubmissionId) return `leetcode-submission:${identity.leetcodeSubmissionId}`;
  return `submission:${identity.submissionDbId ?? ""}`;
}

export function buildLeetCodeCompletionKeys(identity: LeetCodeCompletionIdentity): string[] {
  const keys: string[] = [];
  const titleSlug = identity.titleSlug?.trim();
  if (titleSlug) keys.push(`slug:${titleSlug}`);
  if (typeof identity.leetcodeNumber === "number") keys.push(`number:${identity.leetcodeNumber}`);
  if (identity.problemId) keys.push(`problem:${identity.problemId}`);
  if (identity.leetcodeSubmissionId) keys.push(`leetcode-submission:${identity.leetcodeSubmissionId}`);
  if (identity.submissionDbId) keys.push(`submission:${identity.submissionDbId}`);
  if (keys.length === 0) keys.push(buildLeetCodeCompletionKey(identity));
  return keys;
}

function findMatchingCompletion(
  identity: LeetCodeCompletionIdentity,
  completions: TodayLeetCodeCompletion[],
): TodayLeetCodeCompletion | null {
  const identityKeys = new Set(buildLeetCodeCompletionKeys(identity));
  let match: TodayLeetCodeCompletion | null = null;

  for (const completion of completions) {
    const completionKeys = new Set([
      completion.key,
      ...buildLeetCodeCompletionKeys(completion),
    ]);
    const matches = [...identityKeys].some((key) => completionKeys.has(key));
    if (!matches) continue;
    if (!match || completion.completedAt > match.completedAt) {
      match = completion;
    }
  }

  return match;
}

function isCompletionRecord(value: unknown, today: string): value is TodayLeetCodeCompletion {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<TodayLeetCodeCompletion>;
  return (
    record.date === today
    && typeof record.key === "string"
    && typeof record.submissionDbId === "string"
    && typeof record.problemId === "string"
    && (record.action === "imported" || record.action === "linked_existing" || record.action === "rated")
  );
}

export function loadTodayLeetCodeCompletions(today = todayStr()): TodayLeetCodeCompletion[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(buildTodayLeetCodeCompletionsStorageKey(today)) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((record): record is TodayLeetCodeCompletion => isCompletionRecord(record, today))
      .map((record) => ({
        ...record,
        leetcodeSubmissionId: record.leetcodeSubmissionId ?? null,
        titleSlug: record.titleSlug ?? null,
        leetcodeNumber: record.leetcodeNumber ?? null,
      }));
  } catch {
    return [];
  }
}

export function saveTodayLeetCodeCompletions(
  completions: TodayLeetCodeCompletion[],
  today = todayStr(),
): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(
    buildTodayLeetCodeCompletionsStorageKey(today),
    JSON.stringify(completions.filter((record) => record.date === today)),
  );
}

export function mergeTodayLeetCodeCompletion(
  completions: TodayLeetCodeCompletion[],
  completion: LeetCodeCompletionIdentity & {
    submissionDbId: string;
    problemId: string;
    action: TodayLeetCodeCompletionAction;
    completedAt?: string;
  },
  today = todayStr(),
  now = new Date().toISOString(),
): TodayLeetCodeCompletion[] {
  const nextRecord: TodayLeetCodeCompletion = {
    key: buildLeetCodeCompletionKey(completion),
    date: today,
    completedAt: completion.completedAt ?? now,
    submissionDbId: completion.submissionDbId,
    leetcodeSubmissionId: completion.leetcodeSubmissionId || null,
    titleSlug: completion.titleSlug || null,
    leetcodeNumber: completion.leetcodeNumber ?? null,
    problemId: completion.problemId,
    action: completion.action,
  };
  const nextKeys = new Set(buildLeetCodeCompletionKeys(nextRecord));
  nextKeys.add(nextRecord.key);
  const withoutExisting = completions.filter((record) => {
    if (record.date !== today) return false;
    const recordKeys = new Set([
      record.key,
      ...buildLeetCodeCompletionKeys(record),
    ]);
    return ![...nextKeys].some((key) => recordKeys.has(key));
  });
  return [...withoutExisting, nextRecord];
}

export function addTodayLeetCodeCompletion(
  completion: LeetCodeCompletionIdentity & {
    submissionDbId: string;
    problemId: string;
    action: TodayLeetCodeCompletionAction;
  },
  today = todayStr(),
): TodayLeetCodeCompletion[] {
  const next = mergeTodayLeetCodeCompletion(loadTodayLeetCodeCompletions(today), completion, today);
  saveTodayLeetCodeCompletions(next, today);
  return next;
}

export function isLeetCodeSubmissionCompletedToday(
  identity: LeetCodeCompletionIdentity,
  completions: TodayLeetCodeCompletion[],
): boolean {
  return findMatchingCompletion(identity, completions) !== null;
}

export function buildLeetCodeSubmissionsWithCompletions(
  submissions: LeetCodeSubmission[],
  completions: TodayLeetCodeCompletion[],
): LeetCodeSubmission[] {
  return submissions.map((submission) => {
    const completion = findMatchingCompletion({
      submissionDbId: submission.id,
      leetcodeSubmissionId: submission.leetcodeSubmissionId,
      titleSlug: submission.titleSlug,
      leetcodeNumber: submission.leetcodeNumber,
      problemId: submission.problemId,
    }, completions);
    if (!completion) return submission;
    return {
      ...submission,
      problemId: completion.problemId,
      status: completion.action,
    };
  });
}
