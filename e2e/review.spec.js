import { test, expect } from "@playwright/test";
import { buildProblem, seedProblems, getStoredProblems } from "./fixtures.js";

test.describe("Review Flow", () => {
  test("review a due problem from dashboard", async ({ page }) => {
    const problem = buildProblem({
      title: "Binary Search",
      leetcodeNumber: 704,
      difficulty: "Easy",
      patterns: ["Binary Search"],
      confidence: 2,
      nextReviewDate: new Date().toISOString().split("T")[0], // due today
    });
    await seedProblems(page, [problem]);
    await page.goto("/");

    // Should see the problem on dashboard (use first() since "Binary Search" appears as title + pattern tag)
    await expect(page.getByText("Binary Search").first()).toBeVisible();

    // Click "Review Now"
    await page.getByRole("button", { name: "Review Now" }).click();

    // Rate confidence: click 4th star in the interactive rating
    await page.getByRole("radiogroup").locator("span").nth(3).click();

    // Click Done
    await page.getByRole("button", { name: "Done" }).click();

    // Verify toast shows progress
    await expect(page.getByText(/1 of \d+ done/)).toBeVisible();

    // Verify confidence updated in localStorage
    const stored = await getStoredProblems(page);
    expect(stored[0].confidence).toBe(4);
    expect(stored[0].lastReviewed).toBeTruthy();
  });

  test("dismiss a problem postpones it", async ({ page }) => {
    const today = new Date().toISOString().split("T")[0];
    const problem = buildProblem({
      title: "Two Sum",
      nextReviewDate: today,
    });
    await seedProblems(page, [problem]);
    await page.goto("/");

    await page.getByRole("button", { name: "Dismiss" }).click();

    // Problem should disappear from today's reviews
    const stored = await getStoredProblems(page);
    expect(stored[0].nextReviewDate).not.toBe(today);
  });

  test("excluded problems do not appear in reviews", async ({ page }) => {
    const today = new Date().toISOString().split("T")[0];
    const included = buildProblem({ title: "Visible Problem", nextReviewDate: today });
    const excluded = buildProblem({
      title: "Hidden Problem",
      nextReviewDate: today,
      excludeFromReview: true,
    });
    await seedProblems(page, [included, excluded]);
    await page.goto("/");

    await expect(page.getByText("Visible Problem")).toBeVisible();
    // "Hidden Problem" should NOT appear on the dashboard at all
    // (excluded problems are filtered out of the review queue)
    await expect(page.getByText("Hidden Problem")).not.toBeVisible();
  });
});
