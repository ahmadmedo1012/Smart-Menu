/**
 * Round79 Stage C — Full customer journey E2E (closing gap #5).
 *
 * Mandatory matrix (cannot be reduced): 3 viewports (375/768/1440) × 2 themes
 * (light/dark) × RTL, payment provider rotation libyana/madar/bank so every
 * provider is submitted in both themes and seen at every size.
 *
 * Journey: / → /pricing → /subscribe (plan → wizard → register) → PaymentDialog
 * (each provider tab rendered + cell's provider submitted) → admin verifies →
 * approved panel → /owner → menu management (category + 2 featured items via
 * the Stage-H control) → /owner/qr (QR generated + resized) → logout → /login
 * (real login) → /owner → /menu/[slug] (Stage-H showcase: arrows + dots + full
 * grid below intact).
 *
 * Mandatory tools: Playwright actual run, axe-core scan on every page in the
 * path, screenshots for every step × viewport × theme (evidence under
 * /home/z/my-project/download/round79-phaseC/).
 *
 * Run:
 *   BASE_URL=http://localhost:3002 npx playwright test
 *     tests/e2e/round79-phaseC-journey.spec.ts --project=round79-c --workers=1
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3002";
const OUT = "/home/z/my-project/download/round79-phaseC";
const SHOTS = join(OUT, "screenshots");
mkdirSync(SHOTS, { recursive: true });

const ROOT = join(process.cwd());
const AXE_SRC = readFileSync(join(ROOT, "node_modules/axe-core/axe.min.js"), "utf8");

const ADMIN_USER = process.env.PHASEC_ADMIN_USER || "admin";
const ADMIN_PASS = process.env.PHASEC_ADMIN_PASS || "admin123456";
const PLAN_PRICE = process.env.PHASEC_PLAN_PRICE || "29";
const PASSWORD = "Owner123!";

interface Cell {
  w: number;
  h: number;
  theme: "light" | "dark";
  provider: "libyana" | "madar" | "bank";
}

/* 6 matrix cells — provider rotation covers each method in both themes and
 * every viewport sees two different providers. */
const MATRIX: Cell[] = [
  { w: 375, h: 812, theme: "light", provider: "libyana" },
  { w: 375, h: 812, theme: "dark", provider: "madar" },
  { w: 768, h: 1024, theme: "light", provider: "bank" },
  { w: 768, h: 1024, theme: "dark", provider: "libyana" },
  { w: 1440, h: 900, theme: "light", provider: "madar" },
  { w: 1440, h: 900, theme: "dark", provider: "bank" },
];

/* B-phase post-fix axe baseline (pre-existing color-contrast only).
 * Hard gate = no NEW rule ids; node counts recorded as evidence.
 * ROUND80 (2026-09-05): re-measured with the FeaturedShowcase section
 * VISIBLE (3 featured items) using this exact config (runOnly wcag2a/
 * wcag2aa/wcag21aa): menu-slug|light = 0 nodes, menu-slug|dark = 0 nodes
 * — the section adds ZERO WCAG violations (4 landmark best-practice rules
 * from the full axe ruleset are pre-existing and not wcag-tagged).
 * Node-count guard added: fails if nodes exceed the recorded baseline. */
const AXE_BASELINE: Record<string, number> = {
  "home|light": 1, "home|dark": 2,
  "pricing|light": 1, "pricing|dark": 3,
  "login|light": 0, "login|dark": 0,
  "subscribe|light": 0, "subscribe|dark": 1,
  "owner|light": 1, "owner|dark": 13,
  "owner-menu|light": 0, "owner-menu|dark": 3,
  "owner-qr|light": 0, "owner-qr|dark": 1,
  "menu-slug|light": 0, "menu-slug|dark": 0,
};

const runTs = Date.now().toString().slice(-8);
const t0 = Date.now();
const journey: Array<Record<string, unknown>> = [];
const axeEvidence: Array<Record<string, unknown>> = [];

function log(msg: string) {
  const el = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[phaseC +${el}s] ${msg}`);
}

/* ── console/network watch with diagnosed-benign filter ─────────────────── */
function watchConsole(page: Page) {
  const errors: string[] = [];
  const apiErrors: string[] = [];
  const notFoundUrls: string[] = [];
  const onConsole = (m: { type(): string; text(): string }) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 220));
  };
  const onPageError = (e: Error) => errors.push(`pageerror: ${String(e).slice(0, 220)}`);
  const onResponse = (r: { status(): number; url(): string }) => {
    if (r.status() === 404) notFoundUrls.push(r.url());
    if (r.status() >= 400 && r.url().includes("/api/")) {
      // anonymous session probe (login/subscribe pages) = correct behavior
      if (r.status() === 401 && r.url().includes("/api/auth/me")) return;
      // PaymentDialog mounts during the wizard BEFORE registration (plan
      // chosen → currentPlan set → dialog renders hidden) and its useConfig
      // hook fetches /api/config while still anonymous → 401 with documented
      // fallback to default wallet phones. Same pre-auth-probe class as
      // /api/auth/me. Recorded in the phase report as an architectural note.
      if (r.status() === 401 && r.url().includes("/api/config")) return;
      apiErrors.push(`http ${r.status()} ${r.url().slice(0, 140)}`);
    }
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  return {
    apiErrors,
    notFoundUrls,
    real(): string[] {
      // @vercel/analytics injects /_vercel/insights/script.js on every page —
      // it exists on Vercel deployments but 404s on a local `next start`
      // (dev-only artifact; verified pre-existing, unrelated to the journey)
      const insightsOnly404s = notFoundUrls.every((u) => u.includes("/_vercel/insights/"));
      return errors.filter((e) => {
        if (e.includes("AbortError")) return false;
        if (e.includes("/_vercel/insights/")) return false;
        // React dev-mode requires eval() for stack reconstruction; the local
        // dev server's CSP blocks it. React itself states it never uses eval()
        // in production builds — dev-only artifact, filtered (round80).
        if (/^eval\(\) is not supported in this environment/.test(e)) return false;
        // fetch-failure console lines for the allowed 401 session probe
        if (/^Failed to load resource: the server responded with a status of 401/.test(e)) return false;
        // bare 404 console lines carry no URL — safe to drop only when every
        // recorded 404 response was the local-only analytics script
        if (insightsOnly404s && /^Failed to load resource: the server responded with a status of 404/.test(e)) {
          return false;
        }
        return true;
      });
    },
  };
}

/* ── screenshot + evidence row per step ─────────────────────────────────── */
function shotName(cell: Cell, step: string) {
  return join(SHOTS, `${cell.w}-${cell.theme}-${step}.png`);
}

async function step(page: Page, cell: Cell, name: string, note = "") {
  await page.screenshot({ path: shotName(cell, name), fullPage: false });
  log(`${cell.w}/${cell.theme} step ${name} ${note}`);
}

/* ── axe-core scan (mandatory tool) on every page in the path ───────────── */
async function axeScan(page: Page, key: string, cell: Cell) {
  const row: Record<string, unknown> = { cell: `${cell.w}-${cell.theme}`, page: key };
  try {
    // round80: transient sonner toasts (e.g. the post-approval success toast)
    // make scans non-deterministic — wait for them to auto-dismiss (bounded)
    // before measuring, so the node-count ratchet is stable run-to-run.
    await page
      .locator("[data-sonner-toast]")
      .waitFor({ state: "detached", timeout: 8000 })
      .catch(() => {});
    await page.addScriptTag({ content: AXE_SRC });
    const violations = await page.evaluate(async () => {
      const r = await (window as unknown as {
        axe: { run: (ctx: unknown, cfg: unknown) => Promise<{ violations: unknown[] }> };
      }).axe.run(document, {
        resultTypes: ["violations"],
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      });
      return (r as { violations: Array<{ id: string; impact: string; nodes: unknown[] }> }).violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
      }));
    });
    const nodes = (violations as Array<{ nodes: number }>).reduce((s, v) => s + v.nodes, 0);
    const baseline = AXE_BASELINE[`${key}|${cell.theme}`] ?? 0;
    const newRules = (violations as Array<{ id: string }>).filter((v) => v.id !== "color-contrast");
    const detail = (violations as Array<{ id: string; nodes: number }>)
      .map((v) => `${v.id}(${v.nodes})`)
      .join(",");
    Object.assign(row, { nodes, baseline, violations });
    axeEvidence.push(row);
    return { nodes, baseline, newRules, detail };
  } catch (e) {
    Object.assign(row, { error: String(e).slice(0, 160) });
    axeEvidence.push(row);
    return { nodes: -1, baseline: 0, newRules: [{ id: "axe-run-failed" }], detail: "axe-run-failed" };
  }
}

/* ── RTL integrity: dir/lang + leaked LTR islands holding Arabic text ───── */
async function rtlCheck(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const rtl = doc.dir === "rtl" && doc.lang === "ar";
    const leaks: string[] = [];
    document.querySelectorAll("[dir='ltr']").forEach((el) => {
      const t = (el.textContent || "").trim();
      // legit LTR islands hold latin/code content only; Arabic text inside an
      // LTR island = mirroring leak
      if (/[\u0600-\u06FF]/.test(t) && t.length > 0 && t.length < 90) {
        leaks.push(t.slice(0, 48));
      }
    });
    return { rtl, leaks: [...new Set(leaks)].slice(0, 5) };
  });
}

async function assertPageHealth(page: Page, cell: Cell, key: string, watch: ReturnType<typeof watchConsole>) {
  const dir = await rtlCheck(page);
  expect(dir.rtl, `${key}: html dir=rtl lang=ar`).toBeTruthy();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  );
  const axe = await axeScan(page, key, cell);
  journey.push({
    cell: `${cell.w}-${cell.theme}`, page: key,
    rtl: dir.rtl, ltrLeaks: dir.leaks, overflow,
    axeNodes: axe.nodes, axeBaseline: axe.baseline, axeNewRules: axe.newRules,
    consoleErrors: watch.real().slice(0, 4), apiErrors: watch.apiErrors.slice(0, 4),
  });
  expect(overflow, `${key}: no horizontal overflow @${cell.w}`).toBeFalsy();
  expect(axe.newRules, `${key}: axe — no new rule ids vs B baseline`).toEqual([]);
  // round80 guard: node budget — fails the run when violation NODES exceed
  // the recorded baseline (ratchet: fix violations → lower the baseline).
  // Exceeding it requires updating AXE_BASELINE with a documented reason.
  expect(
    axe.nodes,
    `${key}: axe node count ≤ baseline (${axe.baseline}) — ratchet guard [${axe.detail}]`
  ).toBeLessThanOrEqual(axe.baseline);
}

async function settle(page: Page, ms = 2500) {
  await page.waitForTimeout(ms);
}

/* ── admin payment verification (separate context, real API) ────────────── */
async function approvePayment(browser: Browser, paymentId: number, cell: Cell) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const out = { loginOk: false, verifyStatus: 0, verifyBody: "" };
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settle(page, 1500);
    await page.fill("#username", ADMIN_USER);
    await page.fill("#password", ADMIN_PASS);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/admin/, { timeout: 30000 });
    out.loginOk = true;
    const res = (await page.evaluate(
      async ({ id, url }) => {
        const token =
          document.cookie.split("; ").find((c) => c.startsWith("csrf-token="))?.split("=").slice(1).join("=") ?? "";
        const r = await fetch(`${url}/api/admin/subscriptions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": token },
          credentials: "same-origin",
          body: JSON.stringify({ id, status: "verified" }),
        });
        return { status: r.status, body: (await r.text()).slice(0, 220) };
      },
      { id: paymentId, url: BASE }
    )) as { status: number; body: string };
    out.verifyStatus = res.status;
    out.verifyBody = res.body;
    await page.screenshot({ path: shotName(cell, `admin-verify-${paymentId}`) });
  } finally {
    await ctx.close();
  }
  return out;
}

/* ── submit registration + ride out the 5/min rate limit ────────────────── */
async function registerAndWaitDialog(page: Page): Promise<boolean> {
  for (let i = 0; i < 3; i++) {
    const btn = page.locator('button:has-text("إنشاء الحساب والبدء")');
    if (await btn.count()) {
      await btn.first().click();
      await page.waitForTimeout(6000);
    }
    const dlg = page.locator('[role="dialog"]');
    if ((await dlg.count()) > 0) return true;
    if (page.url().includes("/owner")) return true; // already provisioned
    await page.waitForTimeout(20000); // rate-limit window
  }
  return false;
}

test.describe.configure({ mode: "serial" });

/* ═══ THE JOURNEY — one full customer lifecycle per matrix cell ═══ */
for (const cell of MATRIX) {
  const cellLabel = `${cell.w}px-${cell.theme}-${cell.provider}`;

  test(`journey ${cellLabel}`, async ({ browser }) => {
    test.setTimeout(600_000);
    const ctx = await browser.newContext({ viewport: { width: cell.w, height: cell.h } });
    // next-themes reads localStorage "theme" before first paint — set it per cell
    await ctx.addInitScript(
      (theme) => {
        try {
          localStorage.setItem("theme", theme);
        } catch {
          /* private mode */
        }
      },
      cell.theme
    );
    const page = await ctx.newPage();
    const watch = watchConsole(page);

    const themeLetter = cell.theme === "light" ? "l" : "d";
    const providerLetter = cell.provider[0];
    const user = `qac${cell.w}${themeLetter}${providerLetter}${runTs}`;
    const slug = `qa-c-${cell.w}-${themeLetter}-${providerLetter}-${runTs}`;
    const restaurantName = `مقهى المرحلة C ${cell.w}`;

    /* 1 ── landing "/" */
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settle(page);
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(isDark, `landing: theme applied (${cell.theme})`).toBe(cell.theme === "dark");
    await assertPageHealth(page, cell, "home", watch);
    await step(page, cell, "01-landing");

    /* 2 ── pricing (plan browsing) */
    await page.goto(`${BASE}/pricing`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settle(page);
    await expect(page.locator("body")).toContainText("الخطط");
    await assertPageHealth(page, cell, "pricing", watch);
    await step(page, cell, "02-pricing");

    /* 3 ── subscribe: plan step (paid plan) */
    await page.goto(`${BASE}/subscribe`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settle(page, 3000);
    const premium = page.locator(`button:has-text("${PLAN_PRICE}")`).first();
    await expect(premium).toBeVisible({ timeout: 15000 });
    await premium.click();
    await settle(page, 800);
    const confirm = page.locator('button:has-text("متابعة مع خطة")');
    await expect(confirm).toBeVisible();
    await confirm.first().click();
    await settle(page, 2000);
    await step(page, cell, "03-plan-selected");

    /* 4 ── wizard: menu step → account step → review */
    await page.getByPlaceholder("اسم المطعم (مثال: مقهى الواحة)").fill(restaurantName);
    await page.getByPlaceholder("الرابط المختصر (مثال: al-waha-cafe)").fill(slug);
    await page.getByPlaceholder("رقم الهاتف (مثال: 0912345678)").fill("0912345678");
    await page.getByPlaceholder("رقم الواتساب (مثال: 0912345678)").fill("0912345678");
    await page.locator('button:has-text("التالي")').first().click();
    await settle(page, 1500);
    await page.getByPlaceholder("اسم المستخدم (3 أحرف على الأقل)").fill(user);
    await page.getByPlaceholder(/^كلمة المرور/).fill(PASSWORD);
    await page.locator('button:has-text("التالي")').first().click();
    await settle(page, 1500);
    await step(page, cell, "04-review");

    /* 5 ── register (auto-login) → payment dialog */
    const dlgOk = await registerAndWaitDialog(page);
    expect(dlgOk, "register succeeded → payment dialog opened").toBeTruthy();
    const dlg = page.locator('[role="dialog"]');
    await expect(dlg).toBeVisible();
    await expect(page.locator("body")).toContainText(PLAN_PRICE);
    await step(page, cell, "05-payment-dialog-form");

    /* 6 ── payment dialog: render every provider tab, then submit this cell's */
    for (const label of ["مدار", "تحويل بنكي", "ليبيانا"]) {
      const tab = dlg.locator(`button:has-text("${label}")`).first();
      if (await tab.count()) await tab.click({ timeout: 5000 }).catch(() => {});
      await settle(page, 500);
    }
    await dlg.locator(`button:has-text("${cell.provider === "bank" ? "تحويل بنكي" : cell.provider === "madar" ? "مدار" : "ليبيانا"}")`).first().click();
    await settle(page, 600);

    // capture the payment id from the status poll that starts after submit
    let paymentId = 0;
    page.on("request", (req) => {
      if (!paymentId) {
        const m = req.url().match(/\/api\/subscriptions\/status\?id=(\d+)/);
        if (m) paymentId = Number(m[1]);
      }
    });

    if (cell.provider === "bank") {
      await dlg.getByPlaceholder(/الاسم كما يظهر/).first().fill(`مرحلة C ${cell.w}`);
      await dlg.getByPlaceholder(/رقم الحساب/).first().fill("123456789");
    } else {
      await dlg.getByPlaceholder("09XXXXXXXXX").first().fill("0912345678");
    }
    await settle(page, 400);
    await step(page, cell, "06-payment-filled");
    // axe on the subscribe page WITH the payment dialog open (richest state;
    // B scanned only the logged-out plan view — baseline above)
    await axeScan(page, "subscribe", cell);
    await dlg.locator('button:has-text("إرسال طلب الدفع")').first().click();

    /* 7 ── waiting state (real poll, no auto-verify lie) */
    await expect(dlg.locator('text=في انتظار تأكيد الدفع')).toBeVisible({ timeout: 20000 });
    await step(page, cell, "07-payment-waiting");
    for (let i = 0; i < 20 && !paymentId; i++) await settle(page, 500);
    expect(paymentId, "payment id captured from status poll").toBeGreaterThan(0);

    /* 8 ── admin verifies the payment (real API, separate admin context) */
    const approval = await approvePayment(browser, paymentId, cell);
    expect(approval.loginOk, "admin login for approval").toBeTruthy();
    expect([200, 201]).toContain(approval.verifyStatus);

    /* 9 ── approved panel → enter owner panel (round80 hardening: the dialog
       can auto-navigate to /owner before this click lands — tolerate the race;
       either path must end at the owner dashboard). */
    await expect(dlg.locator('text=تم الموافقة على الاشتراك')).toBeVisible({ timeout: 40000 });
    await step(page, cell, "08-payment-approved");
    await dlg
      .locator('button:has-text("الانتقال إلى لوحة التحكم")')
      .first()
      .click({ timeout: 5000 })
      .catch(() => {});
    await page.waitForURL(/\/owner/, { timeout: 30000 });
    await settle(page, 3000);
    await assertPageHealth(page, cell, "owner", watch);
    await step(page, cell, "09-owner-dashboard");

    /* 10 ── menu management: category + 2 featured items (Stage-H control) */
    await page.goto(`${BASE}/owner/menu`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settle(page, 3000);

    // new restaurants ship with default categories (coffee/juice/dessert…) —
    // the always-present header button opens the category dialog
    await page.locator('button:has-text("تصنيف جديد")').first().click();
    const catDlg = page.locator('[role="dialog"]');
    await expect(catDlg).toBeVisible();
    await catDlg.getByPlaceholder("مشروبات ساخنة").fill("مشروبات المرحلة C");
    await catDlg.locator('button:has-text("إضافة")').first().click();
    await expect(catDlg).toBeHidden({ timeout: 15000 });
    await expect(page.locator("body")).toContainText("مشروبات المرحلة C", { timeout: 15000 });
    await step(page, cell, "10-category-added");

    // expand target = the category NAME text (clicking the header CENTER at
    // 375px lands on the add/edit buttons at the end edge — RTL gotcha)
    const myCatHeader = page.locator("div.cursor-pointer", { hasText: "مشروبات المرحلة C" }).first();
    await expect(myCatHeader).toBeVisible({ timeout: 10000 });
    const myCatCard = page.locator("div.rounded-md", { hasText: "مشروبات المرحلة C" }).last();

    const items = [
      { name: "لاتيه مرحلة C", price: "12.5", rank: "1", tag: "اختيار المرحلة" },
      { name: "كابتشينو مرحلة C", price: "10", rank: "2", tag: "مميز" },
    ];
    for (const it of items) {
      // guard: no lingering dialog portal may intercept the click
      await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 10000 });
      await myCatHeader.locator('button[aria-label="إضافة صنف"]').click();
      const itemDlg = page.locator('[role="dialog"]');
      await expect(itemDlg).toBeVisible();
      await itemDlg.getByPlaceholder("كابتشينو").fill(it.name);
      await itemDlg.locator('input[type="number"]').first().fill(it.price);
      // Stage-H featured control — Base-UI renders a span[role=switch]; the
      // id lands on a HIDDEN input, so target the role element directly
      await itemDlg.locator('[role="switch"]').click();
      await itemDlg.locator('[placeholder="تلقائي"]').fill(it.rank);
      await itemDlg.locator('[placeholder="مقرمش"]').fill(it.tag);
      await itemDlg.locator('button:has-text("إضافة")').first().click();
      await expect(itemDlg).toBeHidden({ timeout: 20000 });
      await settle(page, 1500);
    }
    // expand the category via its NAME (safe spot) to see items + badges
    await expect(page.locator('[role="dialog"]')).toHaveCount(0, { timeout: 10000 });
    await myCatCard.getByText("مشروبات المرحلة C").first().click();
    await settle(page, 1500);
    const badges = myCatCard.locator('[title="مميز — يظهر في القسم السينمائي"]');
    await expect(badges.first()).toBeVisible({ timeout: 15000 });
    expect(await badges.count()).toBeGreaterThanOrEqual(2);
    await expect(myCatCard).toContainText("لاتيه مرحلة C");
    await expect(myCatCard).toContainText("كابتشينو مرحلة C");
    await assertPageHealth(page, cell, "owner-menu", watch);
    await step(page, cell, "11-featured-items");

    /* 11 ── QR generation + resize */
    await page.goto(`${BASE}/owner/qr`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settle(page, 3000);
    const qrImg = page.locator('img[src*="api.qrserver.com"]');
    await expect(qrImg.first()).toBeVisible({ timeout: 45000 });
    await expect(page.locator("body")).toContainText(`/menu/${slug}`);
    const loadedOk = await page.evaluate(
      async () =>
        await new Promise<boolean>((resolve) => {
          const img = document.querySelector('img[src*="api.qrserver.com"]') as HTMLImageElement | null;
          if (!img) return resolve(false);
          if (img.complete && img.naturalWidth > 0) return resolve(true);
          img.addEventListener("load", () => resolve(img.naturalWidth > 0), { once: true });
          img.addEventListener("error", () => resolve(false), { once: true });
          setTimeout(() => resolve(img.naturalWidth > 0), 15000);
        })
    );
    expect(loadedOk, "QR image actually loaded from generator").toBeTruthy();
    await page.locator('button[aria-pressed]').filter({ hasText: "طباعة" }).first().click();
    await settle(page, 1500);
    await expect(qrImg.first()).toBeVisible();
    await assertPageHealth(page, cell, "owner-qr", watch);
    await step(page, cell, "12-qr");

    /* 12 ── logout → real login (تسجيل الدخول) */
    // viewport-aware: the desktop aside is hidden <lg — the mobile logout
    // lives inside the #mobile-nav-sheet opened via "فتح القائمة"
    const desktopLogout = page.locator('aside button:has-text("تسجيل الخروج")');
    const sheetLogout = page.locator('#mobile-nav-sheet button:has-text("تسجيل الخروج")');
    if (await desktopLogout.isVisible().catch(() => false)) {
      await desktopLogout.click();
    } else {
      await page.locator('[aria-label="فتح القائمة"]').first().click();
      await settle(page, 800);
      await sheetLogout.click();
    }
    await page.waitForURL(/\/login/, { timeout: 30000 });
    await settle(page, 2000);
    await assertPageHealth(page, cell, "login", watch);
    await step(page, cell, "13-logged-out-login");

    await page.fill("#username", user);
    await page.fill("#password", PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL(/\/owner/, { timeout: 30000 });
    await settle(page, 2500);
    await step(page, cell, "14-logged-in-owner");

    /* 13 ── end-customer preview: /menu/[slug] with Stage-H showcase */
    await page.goto(`${BASE}/menu/${slug}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settle(page, 3500);
    const showcase = page.locator('[aria-labelledby="featured-showcase-heading"]');
    await expect(showcase).toBeVisible({ timeout: 30000 });
    await expect(page.locator("#featured-showcase-heading")).toHaveText("أصنافنا المميزة");

    // RTL arrow placement: "next" sits on the LEFT in RTL (H-5 fix)
    const prevBtn = page.locator('[aria-label="الصنف السابق"]');
    const nextBtn = page.locator('[aria-label="الصنف التالي"]');
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();
    const prevX = (await prevBtn.boundingBox())?.x ?? 0;
    const nextX = (await nextBtn.boundingBox())?.x ?? 9999;
    expect(nextX, "RTL: next arrow on the left edge").toBeLessThan(prevX);

    // navigate with the arrows — sr-only live counter proves the index moved
    const counter = () => page.evaluate(() => document.querySelector("p.sr-only")?.textContent?.trim() || "");
    await expect.poll(async () => (await counter()).includes("من"), { timeout: 10000 }).toBeTruthy();
    const before = await counter();
    await nextBtn.click();
    await expect
      .poll(async () => (await counter()) !== before, { timeout: 10000 })
      .toBeTruthy();
    const after = await counter();
    log(`showcase counter "${before}" → "${after}"`);
    await step(page, cell, "15-menu-showcase");

    // keyboard gate (round80 hardening — once, desktop light cell): ArrowLeft = next in RTL.
    // The section's onKeyDown only fires when the keydown ORIGINATES inside the
    // section: clicking the <section> itself (non-focusable) leaves focus on
    // <body>, so the old version could pass while the press silently no-opped
    // (counter text was always non-empty). Now: focus an actually-focusable
    // control INSIDE the section, prove focus landed there, then REQUIRE the
    // sr-only live counter to CHANGE — the press is proven effective.
    if (cell.w === 1440 && cell.theme === "light") {
      await nextBtn.focus();
      await expect
        .poll(
          async () =>
            page.evaluate(
              () =>
                document.activeElement?.closest(
                  'section[aria-labelledby="featured-showcase-heading"]'
                ) != null
            ),
          { timeout: 5000 }
        )
        .toBeTruthy();
      const kbBefore = await counter();
      await page.keyboard.press("ArrowLeft");
      await settle(page, 700);
      const kbAfter = await counter();
      log(`keyboard ArrowLeft "${kbBefore}" → "${kbAfter}"`);
      expect(kbAfter.length, "sr-only counter non-empty").toBeGreaterThan(0);
      expect(kbAfter, "ArrowLeft must advance the scene (RTL next)").not.toBe(kbBefore);
    }

    // full grid below the showcase stays intact (2 items created above)
    await expect(page.locator("body")).toContainText("لاتيه مرحلة C");
    await expect(page.locator("body")).toContainText("كابتشينو مرحلة C");
    await assertPageHealth(page, cell, "menu-slug", watch);
    await step(page, cell, "16-menu-grid");

    /* 14 ── final friction verdict for this cell */
    const realErrors = watch.real();
    const apiErrors = watch.apiErrors;
    expect(realErrors, `${cellLabel}: zero real console/page errors`).toEqual([]);
    expect(apiErrors, `${cellLabel}: zero unexpected API 4xx/5xx`).toEqual([]);
    log(`✓ CELL COMPLETE ${cellLabel} — payment #${paymentId} verified, user ${user}, slug ${slug}`);
    journey.push({ cell: cellLabel, paymentId, user, slug, pass: true });

    await ctx.close();
  });
}

/* ═══ evidence writer (runs once after the serial suite) ═══ */
test.afterAll(async () => {
  try {
    writeFileSync(join(OUT, "journey-matrix.json"), JSON.stringify({ runTs, cells: MATRIX.length, journey, axeEvidence }, null, 2));
    log(`evidence written: ${journey.length} page-health rows, ${axeEvidence.length} axe rows`);
  } catch (e) {
    log(`evidence write failed: ${e}`);
  }
});
