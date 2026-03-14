import { test, expect } from "@playwright/test";
import { buildProblem, seedProblems, getStoredProblems } from "./fixtures.js";

test.describe("All Problems View", () => {
  const problems = [
    buildProblem({ id: "p1", title: "Two Sum", leetcodeNumber: 1, difficulty: "Easy", patterns: ["Hash Table"], confidence: 4 }),
    buildProblem({ id: "p2", title: "Add Two Numbers", leetcodeNumber: 2, difficulty: "Medium", patterns: ["Linked List"], confidence: 2 }),
    buildProblem({ id: "p3", title: "Median of Two Sorted Arrays", leetcodeNumber: 4, difficulty: "Hard", patterns: ["Binary Search"], confidence: 1 }),
    buildProblem({ id: "p4", title: "Longest Palindromic Substring", leetcodeNumber: 5, difficulty: "Medium", patterns: ["DP"], confidence: 3 }),
  ];

  test.beforeEach(async ({ page }) => {
    await seedProblems(page, problems);
    await page.goto("/");
    // Navigate to All Problems tab
    await page.getByRole("button", { name: /All Problems/i }).click();
  });

  test("shows all problems with count", async ({ page }) => {
    await expect(page.getByText(/Showing 4 of 4/)).toBeVisible();
  });

  test("search filters by title", async ({ page }) => {
    await page.getByPlaceholder(/search by title/i).fill("Palindromic");
    await expect(page.getByText(/Showing 1 of 4/)).toBeVisible();
    await expect(page.getByText("Longest Palindromic Substring")).toBeVisible();
  });

  test("filter by difficulty", async ({ page }) => {
    // Difficulty is the 2nd select (1st is Pattern filter)
    await page.locator("select").nth(1).selectOption({ label: "Medium" });
    // Wait for filter to apply
    await expect(page.getByText("Add Two Numbers")).toBeVisible();
    await expect(page.getByText("Longest Palindromic Substring")).toBeVisible();
    await expect(page.getByText("Two Sum")).not.toBeVisible();
  });

  test("clear filters resets view", async ({ page }) => {
    await page.getByPlaceholder(/search by title/i).fill("xyz nothing");
    await expect(page.getByText(/Showing 0 of 4/)).toBeVisible();
    await page.getByRole("button", { name: /clear filters/i }).click();
    await expect(page.getByText(/Showing 4 of 4/)).toBeVisible();
  });

  test("delete a problem with confirmation", async ({ page }) => {
    // Click delete on first problem card
    await page.getByTitle("Delete problem").first().click();

    // Confirm dialog should appear
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText(/cannot be undone/i)).toBeVisible();

    // Confirm deletion
    await page.getByRole("button", { name: "Delete" }).click();

    // Should show 3 problems now
    const stored = await getStoredProblems(page);
    expect(stored).toHaveLength(3);
  });

  test("edit a problem by clicking its card", async ({ page }) => {
    // Click the first problem card (not on delete/exclude buttons)
    await page.getByText("Two Sum").click();

    // Edit modal should open with "Problem Details" title
    await expect(page.getByText("Problem Details")).toBeVisible();

    // Should show "Save Changes" button (edit mode)
    await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
  });
});
