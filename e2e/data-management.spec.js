import { test, expect } from "@playwright/test";
import { buildProblem, seedProblems, getStoredProblems } from "./fixtures.js";
import path from "path";
import fs from "fs";

test.describe("Data Management", () => {
  test("export creates a downloadable JSON file", async ({ page }) => {
    const problems = [buildProblem({ title: "Export Test" })];
    await seedProblems(page, problems);
    await page.goto("/");

    await page.getByRole("button", { name: "Settings" }).click();

    // Listen for download
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export Backup/i }).click();
    const download = await downloadPromise;

    // Verify the download
    expect(download.suggestedFilename()).toMatch(/patternbank-backup.*\.json/);

    // Read and verify contents
    const filePath = await download.path();
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(content.problems).toHaveLength(1);
    expect(content.problems[0].title).toBe("Export Test");
  });

  test("import merges data from JSON file", async ({ page }) => {
    // Start with one problem
    await seedProblems(page, [buildProblem({ id: "existing", title: "Existing" })]);
    await page.goto("/");

    // Create a temp import file with a new problem
    const importData = {
      problems: [
        buildProblem({ id: "imported", title: "Imported Problem", leetcodeNumber: 999 }),
      ],
      reviewLog: [],
    };
    const tmpFile = path.join(test.info().outputDir, "import.json");
    fs.mkdirSync(test.info().outputDir, { recursive: true });
    fs.writeFileSync(tmpFile, JSON.stringify(importData));

    await page.getByRole("button", { name: "Settings" }).click();

    // Upload the file
    const fileInput = page.locator("input[type='file']");
    await fileInput.setInputFiles(tmpFile);

    // Verify import toast
    await expect(page.getByText(/Imported 1 new/i)).toBeVisible();

    // Verify both problems in localStorage
    const stored = await getStoredProblems(page);
    expect(stored).toHaveLength(2);
  });
});
