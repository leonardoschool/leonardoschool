import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
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
    // Mobile app (separate project)
    "mobile/**",
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
    },
  },
]);

export default eslintConfig;
