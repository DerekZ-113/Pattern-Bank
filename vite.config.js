import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Web consumes core as source; dist/ exists only as the publish artifact.
      "@patternbank/core": path.resolve(
        import.meta.dirname,
        "packages/core/src/index.ts",
      ),
    },
  },
  test: {
    globals: true,
    // Vitest stubs CSS imports to "". The theme test reads the real token
    // file (as ?raw text) to check it against the colours duplicated in TS
    // and index.html, so let that one file through.
    css: { include: [/src\/index\.css/] },
    include: [
      "tests/**/*.test.{ts,tsx}",
      "packages/core/tests/**/*.test.ts",
    ],
  },
});
