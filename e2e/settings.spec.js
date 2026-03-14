import { test, expect } from "@playwright/test";
import { getStoredProblems } from "./fixtures.js";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("adjust daily review goal", async ({ page }) => {
    // Open settings
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByText("Settings")).toBeVisible();

    // Find the goal display — should default to 5
    const goalDisplay = page.locator("span.text-2xl");
    await expect(goalDisplay).toHaveText("5");

    // Click + twice (use exact match to avoid hitting "+" in Bulk Add and Add Problem buttons)
    const plusButton = page.getByRole("button", { name: "+", exact: true });
    await plusButton.click();
    await plusButton.click();
    await expect(goalDisplay).toHaveText("7");

    // Click - once
    const minusButton = page.getByRole("button", { name: "−", exact: true });
    await minusButton.click();
    await expect(goalDisplay).toHaveText("6");
  });

  test("bulk add problems by number", async ({ page }) => {
    await page.getByRole("button", { name: "Settings" }).click();

    // Open bulk add section
    await page.getByRole("button", { name: /Bulk Add/i }).click();

    // Type problem numbers
    const input = page.getByPlaceholder(/1, 15, 56/i);
    await input.fill("1, 15, 56");
    await input.press("Enter");

    // Should show chips as "ready"
    await expect(page.getByText(/3 ready/i)).toBeVisible();

    // Click Add button
    await page.getByRole("button", { name: /Add 3 Problems/i }).click();

    // Verify toast
    await expect(page.getByText(/Added 3 problems/i)).toBeVisible();

    // Verify in localStorage
    const stored = await getStoredProblems(page);
    expect(stored).toHaveLength(3);
  });
});
