import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Environment
    environment: "jsdom",

    // Setup files run before each test file
    setupFiles: ["./tests/setup.ts"],

    // Global test utilities (describe, it, expect, etc.)
    globals: true,

    // Test isolation with separate processes
    pool: "forks",

    // Automatically restore mocks after each test
    restoreMocks: true,

    // Include patterns
    include: [
      "tests/**/*.{test,spec}.{ts,tsx}",
      "lib/**/*.{test,spec}.{ts,tsx}",
      "server/**/*.{test,spec}.{ts,tsx}",
      "components/**/*.{test,spec}.{ts,tsx}",
    ],

    // Exclude patterns
    exclude: [
      "node_modules",
      "dist",
      ".next",
      "mobile",
      "tests/e2e/**", // E2E tests are run by Playwright
    ],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",

      include: [
        "lib/**/*.{ts,tsx}",
        "server/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
      ],

      exclude: [
        "node_modules",
        "tests",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/index.ts",
        "lib/firebase/config.ts",
      ],

      // 🔒 DEPLOY GATE - Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 75,
      },
    },

    // Test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Retry failed tests
    retry: 1,

    // Reporter
    reporters: ["verbose"],
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
