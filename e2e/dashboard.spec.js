import { test, expect } from "@playwright/test";
import { buildProblem, seedProblems } from "./fixtures.js";

test.describe("Dashboard", () => {
  test("shows welcome screen when no problems", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Welcome to PatternBank/i)).toBeVisible();
  });

  test("shows stats and heatmap with problems", async ({ page }) => {
    const today = new Date().toISOString().split("T")[0];
    const problems = [
      buildProblem({ title: "Alpha Problem", patterns: ["DP"], confidence: 4, nextReviewDate: today }),
      buildProblem({ title: "Beta Problem", patterns: ["Tree"], confidence: 2, nextReviewDate: today }),
      buildProblem({ title: "Gamma Problem", patterns: ["DP"], confidence: 5, nextReviewDate: "2099-01-01" }),
    ];
    await seedProblems(page, problems);
    await page.goto("/");

    // Stats bar should show total and due counts
    const statsBar = page.locator("div").filter({ hasText: /Total|Due/ }).first();
    await expect(statsBar).toBeVisible();

    // Verify the due problems appear in Today's Reviews
    await expect(page.getByText(/Today's Reviews/)).toBeVisible();

    // Pattern heatmap should show DP and Tree
    await expect(page.getByText("DP").first()).toBeVisible();
    await expect(page.getByText("Tree").first()).toBeVisible();

    // Today's reviews should show the 2 due problems
    await expect(page.getByText("Alpha Problem")).toBeVisible();
    await expect(page.getByText("Beta Problem")).toBeVisible();
  });

  test("clicking pattern in heatmap navigates to filtered All Problems", async ({ page }) => {
    const problems = [
      buildProblem({ title: "DP Problem", patterns: ["DP"], nextReviewDate: "2099-01-01" }),
      buildProblem({ title: "Tree Problem", patterns: ["Tree"], nextReviewDate: "2099-01-01" }),
    ];
    await seedProblems(page, problems);
    await page.goto("/");

    // Click DP in heatmap section (scope to avoid hitting pattern tags on review cards)
    const heatmapSection = page.getByText("Pattern Confidence").locator("..").locator("..");
    await heatmapSection.getByText("DP").click();

    // Should switch to All Problems tab with DP filter applied
    await expect(page.getByText("DP Problem")).toBeVisible();
    await expect(page.getByText("Tree Problem")).not.toBeVisible();
  });
});
