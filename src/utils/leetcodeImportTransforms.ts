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
  ReviewEvent,
  TodayLeetCodeItem,
} from "../types";

interface BuildPendingLeetCodeImportsArgs {
  submissions: LeetCodeSubmission[];
  problems: Problem[];
  ignoredImports: LeetCodeIgnoredImport[];
  reviewEvents?: ReviewEvent[];
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

function findExistingProblem(submission: LeetCodeSubmission, problems: Problem[]): Problem | null {
  if (submission.problemId) {
    const byId = problems.find((problem) => problem.id === submission.problemId);
    if (byId) return byId;
  }
  if (submission.leetcodeNumber === null) return null;
  return problems.find((problem) => problem.leetcodeNumber === submission.leetcodeNumber) ?? null;
}

function getLinkedStatusLabel(kind: "linked_existing" | "imported" | "rated", problem: Problem | null, today: string) {
  if (kind === "imported") return "Imported";
  if (kind === "rated") return "Rated";
  if (
    problem
    && !problem.excludeFromReview
    && problem.lastReviewed !== today
    && problem.nextReviewDate <= today
  ) {
    return "Review due";
  }
  return "In library";
}

function isExpired(firstSeenAt: string | undefined, today: string): boolean {
  const firstSeenDate = utcToLocalDateStr(firstSeenAt);
  return !!firstSeenDate && firstSeenDate < today;
}

function toConfidence(value: number | null | undefined): Confidence | null {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 ? value : null;
}

function buildLatestReviewConfidenceByProblem(reviewEvents: ReviewEvent[] | undefined, today: string): Map<string, Confidence> {
  const latest = new Map<string, ReviewEvent>();
  for (const event of reviewEvents ?? []) {
    if (event.date !== today) continue;
    const current = latest.get(event.problemId);
    if (!current || event.timestamp > current.timestamp) {
      latest.set(event.problemId, event);
    }
  }

  const confidenceByProblem = new Map<string, Confidence>();
  for (const [problemId, event] of latest.entries()) {
    const confidence = toConfidence(event.confidence);
    if (confidence !== null) {
      confidenceByProblem.set(problemId, confidence);
    }
  }
  return confidenceByProblem;
}

function wasProblemReviewedToday(
  problem: Pick<Problem, "id" | "lastReviewed"> | null,
  reviewEvents: ReviewEvent[] | undefined,
  today: string,
): boolean {
  if (!problem) return false;
  if (problem.lastReviewed === today) return true;
  return (reviewEvents ?? []).some((event) => event.problemId === problem.id && event.date === today);
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
    if (findExistingProblem(submission, problems)) continue;

    const existing = bySlug.get(submission.titleSlug);
    const firstSeenAt = minTimestamp(existing?.firstSeenAt, submission.createdAt);
    const candidate: PendingLeetCodeImport = {
      submissionDbId: submission.id,
      leetcodeSubmissionId: submission.leetcodeSubmissionId,
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

export function buildTodayLeetCodeItems({
  submissions,
  problems,
  ignoredImports,
  reviewEvents,
  today = todayStr(),
}: BuildPendingLeetCodeImportsArgs): TodayLeetCodeItem[] {
  const ignoredSlugs = new Set(ignoredImports.map((item) => item.titleSlug));
  const bySlug = new Map<string, TodayLeetCodeItem>();
  const reviewedConfidenceByProblem = buildLatestReviewConfidenceByProblem(reviewEvents, today);

  for (const submission of submissions) {
    if (utcToLocalDateStr(submission.submittedAt) !== today) continue;
    if (submission.status === "ignored") continue;
    if (submission.status === "imported" || submission.status === "rated") continue;
    if (ignoredSlugs.has(submission.titleSlug)) continue;

    const existing = bySlug.get(submission.titleSlug);
    const matchedProblem = findExistingProblem(submission, problems);
    if (wasProblemReviewedToday(matchedProblem, reviewEvents, today)) continue;
    const suggestedPatterns = matchedProblem?.patterns.length
      ? matchedProblem.patterns
      : getPatternsForProblemNumber(submission.leetcodeNumber);
    const knownKind = submission.status === "linked_existing" && matchedProblem
      ? submission.status
      : submission.status === "detected" && matchedProblem
        ? "linked_existing"
        : null;

    let candidate: TodayLeetCodeItem | null = null;
    if (knownKind) {
      candidate = {
        kind: knownKind,
        submissionDbId: submission.id,
        leetcodeSubmissionId: submission.leetcodeSubmissionId,
        titleSlug: submission.titleSlug,
        title: submission.title,
        leetcodeNumber: submission.leetcodeNumber,
        difficulty: submission.difficulty,
        submittedAt: submission.submittedAt,
        suggestedPatterns,
        matchedProblemId: matchedProblem?.id ?? submission.problemId ?? null,
        status: knownKind,
        statusLabel: getLinkedStatusLabel(knownKind, matchedProblem, today),
        confidence: matchedProblem?.confidence ?? null,
        reviewedTodayConfidence: matchedProblem ? reviewedConfidenceByProblem.get(matchedProblem.id) ?? null : null,
      };
    } else if (isPendingSubmission(submission)) {
      const pendingExisting = existing?.kind === "pending_import" ? existing : undefined;
      const firstSeenAt = minTimestamp(pendingExisting?.firstSeenAt, submission.createdAt);
      candidate = {
        kind: "pending_import",
        status: "detected",
        matchedProblemId: null,
        statusLabel: "Rate to add",
        submissionDbId: submission.id,
        leetcodeSubmissionId: submission.leetcodeSubmissionId,
        titleSlug: submission.titleSlug,
        title: submission.title,
        leetcodeNumber: submission.leetcodeNumber,
        difficulty: submission.difficulty,
        submittedAt: submission.submittedAt,
        firstSeenAt,
        suggestedPatterns,
        expired: isExpired(firstSeenAt, today),
      };
    }

    if (!candidate) continue;

    if (!existing || submission.submittedAt > existing.submittedAt) {
      bySlug.set(submission.titleSlug, candidate);
    } else if (existing.kind === "pending_import" && candidate.kind === "pending_import") {
      const firstSeenAt = minTimestamp(existing.firstSeenAt, candidate.firstSeenAt);
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
