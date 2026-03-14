import { test, expect } from "@playwright/test";
import { buildProblem, seedProblems } from "./fixtures.js";

test.describe("Navigation & Modals", () => {
  test.beforeEach(async ({ page }) => {
    const problems = [buildProblem({ title: "Test Problem" })];
    await seedProblems(page, problems);
    await page.goto("/");
  });

  test("tab navigation between dashboard and all problems", async ({ page }) => {
    // Start on dashboard
    await expect(page.getByText(/Today's Reviews/i)).toBeVisible();

    // Navigate to All Problems
    await page.getByRole("button", { name: /All Problems/i }).click();
    await expect(page.getByPlaceholder(/search by title/i)).toBeVisible();

    // Navigate back to Dashboard
    await page.getByRole("button", { name: /Dashboard/i }).click();
    await expect(page.getByText(/Today's Reviews/i)).toBeVisible();
  });

  test("modal closes on escape key", async ({ page }) => {
    await page.getByRole("button", { name: "Add Problem" }).click();
    await expect(page.getByText("Add New Problem")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByText("Add New Problem")).not.toBeVisible();
  });

  test("modal closes on overlay click", async ({ page }) => {
    await page.getByRole("button", { name: "Add Problem" }).click();
    await expect(page.getByText("Add New Problem")).toBeVisible();

    // Click the overlay (outside the modal container)
    await page.locator(".fixed.inset-0.bg-black\\/70").click({ position: { x: 10, y: 10 } });
    await expect(page.getByText("Add New Problem")).not.toBeVisible();
  });

  test("settings modal opens and closes", async ({ page }) => {
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Settings" })).not.toBeVisible();
  });
});
