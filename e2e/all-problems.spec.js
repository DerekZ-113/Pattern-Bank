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
    // Navigate to Problems tab
    await page.getByRole("button", { name: /Problems/i }).click();
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
    await page.getByLabel("Difficulty").selectOption({ label: "Medium" });
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
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete", exact: true }).click();

    // Should show 3 problems now
    const stored = await getStoredProblems(page);
    expect(stored).toHaveLength(3);
  });

  test("review a due problem inline without opening the editor", async ({ page }) => {
    // Every seeded problem is due today (buildProblem defaults nextReviewDate to today).
    const card = page.locator("article", { hasText: "Two Sum" });
    // exact: the card also has an "Exclude from review" button.
    await card.getByRole("button", { name: "Review", exact: true }).click();

    // The rate panel opens in place — no edit modal.
    await expect(card.getByRole("radiogroup")).toBeVisible();
    await expect(page.getByText("Problem Details")).not.toBeVisible();

    await card.getByRole("radio", { name: "5 stars" }).click();
    await card.getByRole("button", { name: "Done" }).click();

    // Same toast as a Today review, and the card leaves the due state.
    await expect(page.getByText(/1 of \d+ done/)).toBeVisible();
    await expect(card.getByText(/Next review:/)).toBeVisible();
    await expect(card.getByRole("button", { name: "Review", exact: true })).toHaveCount(0);

    const stored = await getStoredProblems(page);
    const twoSum = stored.find((p) => p.id === "p1");
    expect(twoSum.confidence).toBe(5);
    expect(twoSum.lastReviewed).toBeTruthy();
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
