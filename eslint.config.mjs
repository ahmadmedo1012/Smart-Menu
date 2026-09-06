import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // round90-F6: coverage/ is vitest --coverage generated output (html/lcov)
    // — `eslint .` used to sweep it and emit unused eslint-disable warnings
    // (health-devex recommendation #4); the `lint` script (src/ tests/) never
    // did. .next/** was already here — kept.
    "coverage/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    ".claude/**",
    "playwright-report/**",
    "open-design/**",
    "public/**",
    "scripts/**",
    "facebook-workspace/**",
    "obsidian-vault/**",
    "smart-menu/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      // round89-A6: debt paid down (dx-1: 2 real `any` left) — flipped from
      // "off" to "warn" as a regression guard; the goal is zero again
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-expressions": "off",
      "@next/next/no-img-element": "off",
      "jsx-a11y/alt-text": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
