/**
 * Shared test helpers for Playwright E2E tests.
 * Injects/clears localStorage to control app state without Supabase.
 */

const STORAGE_KEY = "patternbank-problems";
const REVIEW_LOG_KEY = "patternbank-review-log";
const REVIEW_EVENTS_KEY = "patternbank-review-events";
const PREFERENCES_KEY = "patternbank-preferences";

export function localTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Bypass the marketing landing page for tests that need the app with no data.
 * Call before page.goto().
 */
export async function skipLanding(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("patternbank-skip-landing", "true");
  });
}

/**
 * Build a problem object matching the app's internal shape.
 */
export function buildProblem(overrides = {}) {
  const now = new Date().toISOString();
  const today = localTodayStr();
  return {
    id: `test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: "Test Problem",
    leetcodeNumber: null,
    url: null,
    difficulty: "Medium",
    patterns: ["Two Pointers"],
    confidence: 3,
    notes: "",
    excludeFromReview: false,
    dateAdded: today,
    lastReviewed: null,
    nextReviewDate: today,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Inject problems into localStorage before the page loads.
 * Call this BEFORE page.goto().
 */
export async function seedProblems(page, problems) {
  await page.addInitScript(({ key, data }) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, { key: STORAGE_KEY, data: problems });
}

/**
 * Inject preferences into localStorage before the page loads.
 */
export async function seedPreferences(page, prefs) {
  await page.addInitScript(({ key, data }) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, { key: PREFERENCES_KEY, data: prefs });
}

/**
 * Inject detailed review events into localStorage before the page loads.
 */
export async function seedReviewEvents(page, events) {
  await page.addInitScript(({ key, data }) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, { key: REVIEW_EVENTS_KEY, data: events });
}

/**
 * Read current problems from localStorage (after page is loaded).
 */
export async function getStoredProblems(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }, STORAGE_KEY);
}

/**
 * Clear all app data from localStorage before the page loads.
 * Note: Playwright creates a fresh browser context per test by default,
 * so this is only needed if you're reusing a page within a test.
 */
export async function clearAppData(page) {
  await page.addInitScript(({ sk, rk, rek, pk }) => {
    localStorage.removeItem(sk);
    localStorage.removeItem(rk);
    localStorage.removeItem(rek);
    localStorage.removeItem(pk);
  }, { sk: STORAGE_KEY, rk: REVIEW_LOG_KEY, rek: REVIEW_EVENTS_KEY, pk: PREFERENCES_KEY });
}
