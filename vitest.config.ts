import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["node_modules", ".next"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["src/lib/**", "src/app/api/**"],
      exclude: ["node_modules", ".next", "src/generated/**"],
      // round85-D3: ratchet calibration. The old 50/50/40/50 thresholds were
      // aspirational and RED for a long time (nothing ran them) — dead weight.
      // round88-D2: re-measured after the 4 new money-path/polling files
      // (+72 tests: orders create/list+count, user-events+health, withRetry):
      // 33.1 stmts / 31.0 branch / 38.07 funcs / 34.33 lines. Thresholds
      // raised with a ~5-point SAFETY margin (waves A2/C add code before the
      // round closes — the ratchet must stay green through them).
      // round89-D2 (ratchet raise, raise-only rule): re-measured after waves
      // 1-3 (money-path, security, modifiers + this wave's 61 tests on the
      // 0% admin routes & lib files): 61.62 stmts / 56.5 branch / 62.28 funcs
      // / 63.53 lines. Raised from 28/25/33/29 to actual-minus-~2-point
      // safety margin (rounds G/H still add code before the round closes).
      // Raise these numbers as coverage grows — never lower them.
      thresholds: {
        statements: 59,
        branches: 54,
        functions: 60,
        lines: 61,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
