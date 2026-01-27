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
        "components/ui/loaders/**/*.{ts,tsx}",
        "components/ui/Button.tsx",
        "components/ui/Input.tsx",
        "components/ui/Toast.tsx",
      ],

      exclude: [
        "node_modules",
        "tests",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/index.ts",
        // Firebase (requires real connection)
        "lib/firebase/**",
        // Prisma client (requires real DB)
        "lib/prisma/**",
        // Cache (requires server context)
        "lib/cache/**",
        // Email services (requires external services)
        "lib/email/**",
        // API clients (requires real API)
        "lib/api/**",
        // Hooks with React context dependencies
        "lib/hooks/**",
        // Middleware (requires Next.js runtime)
        "lib/middleware/**",
        // Notification system (complex dependencies)
        "lib/notifications/**",
        // tRPC client/provider (requires runtime)
        "lib/trpc/**",
        // Data files (static data, no logic to test)
        "lib/data/**",
        // Utils that require runtime context or browser
        "lib/utils/contractPdf.ts",
        "lib/utils/logger.ts",
        "lib/utils/notificationSound.ts",
        "lib/utils/requestContext.ts",
        "lib/utils/simulationPdfGenerator.ts",
        "lib/utils/matricolaUtils.ts", // generateMatricola requires Prisma
        "lib/utils.ts",
      ],

      // 🔒 DEPLOY GATE - Coverage thresholds
      // Applied only to testable utility files
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
