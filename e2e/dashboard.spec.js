import { test, expect } from "@playwright/test";
import { buildProblem, seedPreferences, seedProblems, seedReviewEvents, skipLanding, localTodayStr } from "./fixtures.js";

test.describe("Today", () => {
  test("shows welcome screen when no problems", async ({ page }) => {
    await skipLanding(page);
    await page.goto("/");
    await expect(page.getByText(/Start tracking your practice/i)).toBeVisible();
  });

  test("shows due reviews without old dashboard analytics", async ({ page }) => {
    const today = localTodayStr();
    const problems = [
      buildProblem({ title: "Alpha Problem", patterns: ["DP"], confidence: 4, nextReviewDate: today }),
      buildProblem({ title: "Beta Problem", patterns: ["Tree"], confidence: 2, nextReviewDate: today }),
      buildProblem({ title: "Gamma Problem", patterns: ["DP"], confidence: 5, nextReviewDate: "2099-01-01" }),
    ];
    await seedProblems(page, problems);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
    await expect(page.getByText("Reviews due")).toBeVisible();
    await expect(page.getByText("Alpha Problem")).toBeVisible();
    await expect(page.getByText("Beta Problem")).toBeVisible();
    await expect(page.getByText("Pattern Confidence")).not.toBeVisible();
  });

  test("see all due navigates to All Problems", async ({ page }) => {
    const today = localTodayStr();
    const problems = [
      buildProblem({ title: "First Due Problem", confidence: 1, nextReviewDate: today }),
      buildProblem({ title: "Second Due Problem", confidence: 2, nextReviewDate: today }),
    ];
    await seedPreferences(page, {
      dailyReviewGoal: 1,
      hidePatternsDuringReview: false,
      enabledExtraPatterns: [],
    });
    await seedProblems(page, problems);
    await page.goto("/");

    await page.getByRole("button", { name: /See all 2 due/i }).click();

    await expect(page.getByPlaceholder(/search by title/i)).toBeVisible();
    await expect(page.getByText("First Due Problem")).toBeVisible();
    await expect(page.getByText("Second Due Problem")).toBeVisible();
  });

  test("shows Done today from PatternBank review events", async ({ page }) => {
    const today = localTodayStr();
    const problem = buildProblem({
      id: "reviewed-problem",
      title: "Reviewed Today Problem",
      confidence: 4,
      nextReviewDate: "2099-01-01",
    });
    await seedProblems(page, [problem]);
    await seedReviewEvents(page, [
      {
        date: today,
        problemId: "reviewed-problem",
        confidence: 4,
        patterns: ["Two Pointers"],
        timestamp: new Date().toISOString(),
      },
    ]);
    await page.goto("/");

    // Heading role: the What's New banner copy can also mention "Done today".
    await expect(page.getByRole("heading", { name: "Done today" })).toBeVisible();
    await expect(page.getByText("Reviewed Today Problem")).toBeVisible();
    await expect(page.getByText("4★")).toBeVisible();
  });
});
