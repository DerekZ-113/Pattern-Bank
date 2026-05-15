import { addDays, generateId, todayStr, utcToLocalDateStr } from "./dateHelpers";
import { getIntervalDays } from "./spacedRepetition";
import { buildLeetCodeUrl } from "./leetcodeProblems";
import { getPatternsForProblemNumber } from "./problemLists";
import type {
  Confidence,
  LeetCodeIgnoredImport,
  LeetCodeSubmission,
  PendingLeetCodeImport,
  Problem,
} from "../types";

interface BuildPendingLeetCodeImportsArgs {
  submissions: LeetCodeSubmission[];
  problems: Problem[];
  ignoredImports: LeetCodeIgnoredImport[];
  today?: string;
}

interface BuildProblemOptions {
  today?: string;
  now?: string;
  autoExpired?: boolean;
}

function minTimestamp(a?: string, b?: string): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function isPendingSubmission(submission: LeetCodeSubmission): boolean {
  return submission.status === "detected" && !submission.problemId;
}

function hasExistingProblem(submission: LeetCodeSubmission, problems: Problem[]): boolean {
  if (submission.leetcodeNumber === null) return false;
  return problems.some((problem) => problem.leetcodeNumber === submission.leetcodeNumber);
}

function isExpired(firstSeenAt: string | undefined, today: string): boolean {
  const firstSeenDate = utcToLocalDateStr(firstSeenAt);
  return !!firstSeenDate && firstSeenDate < today;
}

export function buildPendingLeetCodeImports({
  submissions,
  problems,
  ignoredImports,
  today = todayStr(),
}: BuildPendingLeetCodeImportsArgs): PendingLeetCodeImport[] {
  const ignoredSlugs = new Set(ignoredImports.map((item) => item.titleSlug));
  const bySlug = new Map<string, PendingLeetCodeImport>();

  for (const submission of submissions) {
    if (!isPendingSubmission(submission)) continue;
    if (ignoredSlugs.has(submission.titleSlug)) continue;
    if (hasExistingProblem(submission, problems)) continue;

    const existing = bySlug.get(submission.titleSlug);
    const firstSeenAt = minTimestamp(existing?.firstSeenAt, submission.createdAt);
    const candidate: PendingLeetCodeImport = {
      submissionDbId: submission.id,
      titleSlug: submission.titleSlug,
      title: submission.title,
      leetcodeNumber: submission.leetcodeNumber,
      difficulty: submission.difficulty,
      submittedAt: submission.submittedAt,
      firstSeenAt,
      suggestedPatterns: getPatternsForProblemNumber(submission.leetcodeNumber),
      expired: isExpired(firstSeenAt, today),
    };

    if (!existing || submission.submittedAt > existing.submittedAt) {
      bySlug.set(submission.titleSlug, candidate);
    } else {
      bySlug.set(submission.titleSlug, {
        ...existing,
        firstSeenAt,
        expired: isExpired(firstSeenAt, today),
      });
    }
  }

  return Array.from(bySlug.values()).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function buildProblemFromLeetCodeImport(
  item: PendingLeetCodeImport,
  confidence: Confidence,
  options: BuildProblemOptions = {},
): Problem {
  const today = options.today ?? todayStr();
  const now = options.now ?? new Date().toISOString();
  const autoExpired = options.autoExpired ?? false;

  return {
    id: generateId(),
    title: item.title,
    leetcodeNumber: item.leetcodeNumber,
    url: buildLeetCodeUrl(item.titleSlug),
    difficulty: item.difficulty ?? "Medium",
    patterns: item.suggestedPatterns,
    confidence,
    notes: "",
    excludeFromReview: false,
    dateAdded: today,
    lastReviewed: null,
    nextReviewDate: autoExpired ? today : addDays(today, getIntervalDays(confidence)),
    fiveStarStreak: 0,
    updatedAt: now,
  };
}
