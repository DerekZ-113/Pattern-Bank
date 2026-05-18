import { test, expect } from "@playwright/test";
import { buildProblem, seedProblems } from "./fixtures.js";

test.describe("Progress View", () => {
  test("shows the Progress analytics home", async ({ page }) => {
    const problems = [
      buildProblem({ title: "DP Problem", patterns: ["DP"], confidence: 4 }),
      buildProblem({ title: "Tree Problem", patterns: ["Tree"], confidence: 2 }),
    ];
    await seedProblems(page, problems);
    await page.goto("/");

    await page.getByRole("button", { name: /Progress/i }).click();

    await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();
    await expect(page.getByText("Patterns, streaks, and review history")).toBeVisible();
    await expect(page.getByText("Total Problems")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Patterns", exact: true })).toBeVisible();
    await expect(page.getByText("Review Activity")).toBeVisible();
    await expect(page.getByText("Confidence Trend")).toBeVisible();
    await expect(page.getByText("30-Day Projection")).toBeVisible();
    await expect(page.getByText("Confidence Spread")).toBeVisible();
    await expect(page.getByText("Top Patterns")).toBeVisible();
  });

  test("clicking a pattern filters All Problems", async ({ page }) => {
    const problems = [
      buildProblem({ title: "DP Problem", patterns: ["DP"], confidence: 4 }),
      buildProblem({ title: "Tree Problem", patterns: ["Tree"], confidence: 2 }),
    ];
    await seedProblems(page, problems);
    await page.goto("/");

    await page.getByRole("button", { name: /Progress/i }).click();

    const heatmap = page.locator("section[aria-labelledby='progress-patterns']");
    await heatmap.getByRole("button", { name: /DP.*1 problem.*average confidence 4\.0/i }).click();

    await expect(page.getByText("DP Problem")).toBeVisible();
    await expect(page.getByText("Tree Problem")).not.toBeVisible();
  });
});
