import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    // Use Node environment for pure utility tests (no DOM needed for lib/ tests)
    // Individual test files can override this with @vitest-environment jsdom if needed
    environment: "node",
    // Show a clear diff on failures
    reporters: ["verbose"],
    // Test file patterns
    include: ["src/**/*.test.{js,jsx}", "__tests__/**/*.test.{js,jsx}"],
  },
  resolve: {
    alias: {
      // Mirror the @/ path alias from jsconfig.json
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
