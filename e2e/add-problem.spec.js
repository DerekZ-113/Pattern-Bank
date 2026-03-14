import { test, expect } from "@playwright/test";
import { getStoredProblems } from "./fixtures.js";

test.describe("Add Problem", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("add a LeetCode problem via search", async ({ page }) => {
    // Open the add problem modal
    await page.getByRole("button", { name: "Add Problem" }).click();
    await expect(page.getByText("Add New Problem")).toBeVisible();

    // Search for "Two Sum"
    const searchInput = page.getByPlaceholder(/type number or title/i);
    await searchInput.fill("Two Sum");

    // Select from dropdown
    const result = page.getByRole("button", { name: /Two Sum/i }).first();
    await expect(result).toBeVisible();
    await result.click();

    // Verify problem info populated
    await expect(page.getByText("#1")).toBeVisible();
    await expect(page.getByText("Easy")).toBeVisible();

    // Select a pattern
    await page.getByRole("button", { name: "Hash Table" }).click();

    // Set confidence to 3 stars (click the 3rd star in the radiogroup)
    await page.getByRole("radiogroup").locator("span").nth(2).click();

    // Save
    await page.getByRole("button", { name: "Save Problem" }).click();

    // Verify toast
    await expect(page.getByText("Problem added")).toBeVisible();

    // Verify problem is in localStorage
    const stored = await getStoredProblems(page);
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("Two Sum");
    expect(stored[0].leetcodeNumber).toBe(1);
    expect(stored[0].patterns).toContain("Hash Table");
    expect(stored[0].confidence).toBe(3);
  });

  test("shows duplicate warning for existing problem", async ({ page }) => {
    // First, add a problem
    await page.getByRole("button", { name: "Add Problem" }).click();
    const searchInput = page.getByPlaceholder(/type number or title/i);
    await searchInput.fill("1");
    await page.getByRole("button", { name: /Two Sum/i }).first().click();
    await page.getByRole("button", { name: "Hash Table" }).click();
    await page.getByRole("button", { name: "Save Problem" }).click();
    await expect(page.getByText("Problem added")).toBeVisible();

    // Try to add same problem again
    await page.getByRole("button", { name: "Add Problem" }).click();
    await page.getByPlaceholder(/type number or title/i).fill("1");
    await page.getByRole("button", { name: /Two Sum/i }).first().click();

    // Should show duplicate warning
    await expect(page.getByText(/already in your library/i)).toBeVisible();
  });

  test("validates required fields", async ({ page }) => {
    await page.getByRole("button", { name: "Add Problem" }).click();

    // Switch to custom mode to test title validation
    await page.getByRole("button", { name: "Custom" }).click();

    // Try to save without title or patterns
    await page.getByRole("button", { name: "Save Problem" }).click();

    // Should show validation errors
    await expect(page.getByText(/title is required/i)).toBeVisible();
  });

  test("add a custom problem", async ({ page }) => {
    await page.getByRole("button", { name: "Add Problem" }).click();
    await page.getByRole("button", { name: "Custom" }).click();

    // Fill title
    await page.getByPlaceholder(/e\.g\. Two Sum/i).fill("My Custom Problem");

    // Select difficulty
    await page.getByRole("button", { name: "Medium" }).click();

    // Select pattern
    await page.getByRole("button", { name: "DP" }).click();

    // Save
    await page.getByRole("button", { name: "Save Problem" }).click();
    await expect(page.getByText("Problem added")).toBeVisible();

    const stored = await getStoredProblems(page);
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe("My Custom Problem");
    expect(stored[0].difficulty).toBe("Medium");
  });
});
