import { defineConfig } from "@playwright/test";

const PORT = 5197;

export default defineConfig({
  testDir: ".",
  use: { headless: true, browserName: "chromium", baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
});
