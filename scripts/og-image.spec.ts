import { test } from "@playwright/test";

// The picture shown when a link to PatternBank is shared (public/og-image.png).
// It is a photograph of the real landing page's first screen, so it cannot
// drift from the site: the page is drawn 1400 wide and scaled to 1200 x 630.
// Run with `npm run og-image` after the landing page's first screen changes.

test.use({ viewport: { width: 1400, height: 735 }, deviceScaleFactor: 1200 / 1400 });

test("generate OG image", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  // A picture has nothing to press: drop the buttons and the navigation.
  await page.addStyleTag({ content: "[data-landing-actions] { display: none !important; }" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/og-image.png" });
});
