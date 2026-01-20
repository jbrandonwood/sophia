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
    "src/scripts/**",
    "test-*.ts",
    "test-*.js",
    "validate-env.js",
    "verify-key.js",
    "src/debug_imports.ts",
    "src/debug_init.ts",
    "src/reproduce_issue_mock.ts",
  ]),
]);

export default eslintConfig;
