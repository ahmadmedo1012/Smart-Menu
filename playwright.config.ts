import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // round90-F2: PW_RETRIES makes the retry budget controllable from the
  // outside — the nightly flake-detection workflow runs with PW_RETRIES=0 so
  // tests that only pass on retry surface as real failures (regular CI's
  // retries=2 masks them). Unset → the previous behavior is preserved exactly.
  retries:
    process.env.PW_RETRIES !== undefined
      ? Number(process.env.PW_RETRIES)
      : process.env.CI
        ? 2
        : 0,
  workers: process.env.CI ? 1 : 2,
  // HTML report lives OUTSIDE the tests output dir: Playwright refuses to run
  // when the reporter output folder is nested inside outputDir (test-results/),
  // which previously broke every `--reporter=html` run (round80 §7.2 debt).
  outputDir: "test-results",
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    // Dev default: localhost. Next dev normalizes the middleware request URL
    // to localhost, and the nonce-based CSP stamps scripts only for that
    // normalized host — connecting via 127.0.0.1 leaves inline scripts with
    // nonce="" (CSP strict-dynamic blocks them, client pages never hydrate).
    // Point BASE_URL at http://localhost:3000 for local runs; production
    // (https://menu.smart-link.ly) needs no change.
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "security",
      testMatch: "tests/security/*.test.ts",
    },
    {
      name: "api",
      testMatch: [
        "tests/e2e/api-smoke.test.ts",
        "tests/e2e/api-sweep.test.ts",
        "tests/e2e/full-sweep.test.ts",
        // round85-D1: referral coverage was orphaned (matched NO project —
        // 12 tests never executed anywhere)
        "tests/e2e/referral-claim.spec.ts",
        // round86-A12: negative specs for the USER-role gates (A1/A2/A4/A6)
        "tests/e2e/round86-security.spec.ts",
      ],
    },
    {
      name: "ui",
      testMatch: [
        "tests/e2e/ui-smoke.test.ts",
        "tests/e2e/ui-sweep.test.ts",
        // r93-S1 (موجة 4 — محاكاة المستخدم): الرحلات السعيدة الثلاث
        // (زبون/مالك/أدمن) عبر متصفح حقيقي — same-shape UI journeys فتعلّقت
        // بمشروع ui بدل مشروع تاسع جديد. تتطلب البذرة:
        //   node scripts/round83-seed.mjs && node scripts/r93-sim-seed.mjs
        "tests/e2e/r93-sim-customer.spec.ts",
        "tests/e2e/r93-sim-owner.spec.ts",
        "tests/e2e/r93-sim-admin.spec.ts",
        "tests/e2e/r93-sim-abuser.spec.ts",
      ],
    },
    {
      name: "qa-teams",
      testMatch: [
        // round87-D4: zero-coverage journeys (review, gallery, wizard back,
        // print, theme persistence) — browser journeys, so qa-teams.
        "tests/e2e/round87-journeys.spec.ts",
        "tests/e2e/team1-auth.spec.ts",
        "tests/e2e/team2-customer.spec.ts",
        "tests/e2e/team3-owner.spec.ts",
        "tests/e2e/team4-payments.spec.ts",
        "tests/e2e/team5-admin.spec.ts",
        "tests/e2e/team6-a11y.spec.ts",
        "tests/e2e/team7-security.spec.ts",
        // round88-D: new teams — featured journey (round88-C3: ACTIVATED — the
        // isFeatured chain is complete and guarded), perf smoke budgets, and
        // the rounds 79-87 regression guard. Wired into qa-teams so they run
        // with the serialized team sequence (login rate-limit budget) instead
        // of being orphaned.
        "tests/e2e/team8-featured.spec.ts",
        "tests/e2e/team9-perf-smoke.spec.ts",
        "tests/e2e/team10-regression-guard.spec.ts",
        // w3-f1 (F1-8): modifiers journey — owner editor → public menu → priced order.
        // Lives in tests/e2e/teams/ per the round-89 task spec; listed explicitly
        // because testMatch enumerates files (no glob would pick the new folder).
        "tests/e2e/teams/team11-modifiers.spec.ts",
        "tests/e2e/round80-security.spec.ts",
        "tests/e2e/round80-geometry.spec.ts",
        "tests/e2e/persona-1-customer.spec.ts",
        "tests/e2e/persona-3-owner.spec.ts",
        "tests/e2e/persona-4-multimenu.spec.ts",
        "tests/e2e/persona-6-browser.spec.ts",
        "tests/e2e/persona-7-malicious.spec.ts",
        "tests/e2e/round4-deep.spec.ts",
        "tests/e2e/round5-lifecycle.spec.ts",
        "tests/e2e/round6-subscriptions.spec.ts",
        "tests/e2e/round8-whatsapp.spec.ts",
        "tests/e2e/round29-cart-regression.spec.ts",
      ],
    },
    {
      // Cross-browser smoke: same UI suite on firefox + webkit (production).
      // Run explicitly: npx playwright test tests/e2e/ui-smoke.test.ts --project=qa-cross-browser
      name: "qa-cross-browser",
      testMatch: ["tests/e2e/ui-smoke.test.ts", "tests/e2e/team2-customer.spec.ts", "tests/e2e/persona-6-browser.spec.ts"],
      use: {
        browserName: "firefox",
      },
    },
    {
      name: "qa-cross-browser-webkit",
      testMatch: ["tests/e2e/ui-smoke.test.ts", "tests/e2e/persona-6-browser.spec.ts"],
      use: {
        browserName: "webkit",
      },
    },
    {
      name: "auth-verify",
      testMatch: "tests/e2e/auth-fix-verification.spec.ts",
      // round87-D8: was a hardcoded http://localhost:3000, which silently
      // ignored BASE_URL and pinned the project to localhost — production
      // runs (BASE_URL=https://menu.smart-link.ly) fell back to the default
      // instead of the env like every other project.
      use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000" },
    },
    {
      // round79 Stage C — full customer journey matrix (serial, own project)
      name: "round79-c",
      testMatch: "tests/e2e/round79-phaseC-journey.spec.ts",
      // fail fast on any stuck action instead of silently eating the budget
      use: { actionTimeout: 15000 },
    },
  ],
});
