import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // SonarJS recommended rules for code quality
  sonarjs.configs.recommended,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legacy Flutter webapp (not part of current project)
    "webapp_old/**",
    // Coverage reports (generated files)
    "coverage/**",
  ]),
  // Custom rules
  {
    rules: {
      // Allow unused variables with underscore prefix (intentionally ignored)
      "@typescript-eslint/no-unused-vars": ["warn", { 
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      // Standard React hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Disable React compiler rules that flag valid patterns
      // setState in useEffect for data initialization is a valid and common React pattern
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      
      // SonarJS rule adjustments for React/Next.js codebase
      // Nested conditionals in JSX (ternaries for conditional rendering) are idiomatic React
      "sonarjs/no-nested-conditional": "off",
      // Nested functions (callbacks in JSX props, event handlers) are idiomatic React
      "sonarjs/no-nested-functions": "off",
      // Cognitive complexity - threshold 25 is more realistic for React components
      // Functions with complexity > 25 should be refactored into smaller pieces
      "sonarjs/cognitive-complexity": ["warn", 25],
      // Other rules
      "sonarjs/no-nested-template-literals": "warn",
      "sonarjs/use-type-alias": "warn",
      "sonarjs/redundant-type-aliases": "warn",
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/pseudo-random": "warn",
      "sonarjs/todo-tag": "warn",
    },
  },
  // Relaxed rules for test files
  {
    files: ["tests/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "sonarjs/no-unused-vars": "off", // Test mocks often have unused variables
      "sonarjs/no-identical-functions": "off", // Test setup often has repeated patterns
      "sonarjs/pseudo-random": "off", // Math.random() in tests is acceptable
    },
  },
]);

export default eslintConfig;
