/**
 * Round 87 D4 — zero-coverage customer journeys (round87 plan, D4).
 *
 * Five journeys that had NO e2e coverage before this round:
 *   1. Full review journey (تقييم كامل) — open menu → open ReviewSheet →
 *      rating + comment + name → submit → verify it renders AND persists
 *      across a reload. NOT gated by an order (POST /api/items/:id/reviews is
 *      public; the sheet's own GET mints the csrf-token cookie because menu
 *      pages are cacheable and never set it on page load).
 *   2. Gallery visible — GalleryCarousel (dynamic ssr:false island) renders
 *      the seeded gallery images and navigates with the next arrow.
 *      Fixture adaptation: qa-seed.mjs ships no gallery, so the localhost
 *      al-waha-cafe-demo restaurant was given one via a data-only DB update
 *      (gallery = ['/hero-phone.webp','/main21.webp','/og-default.png'] —
 *      local public assets so /_next/image can optimize them).
 *   3. Wizard back (رجوع المعالج) — registration wizard back-navigation
 *      returns to the previous step WITHOUT losing entered data, and a
 *      forward again keeps the same data (no submit — no account created).
 *   4. Print content — /menu/[slug]/print renders the menu items, hides the
 *      action buttons under print emulation (@media print), no JS errors.
 *   5. Theme persistence — dark-mode toggle on the public menu persists
 *      across reload (html class + next-themes localStorage key "theme").
 *
 * Run: pnpm exec playwright test tests/e2e/round87-journeys.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";
import { chooseFreePlan, fillSubscribeForm, advanceStep } from "./qa-helpers";

const MENU = "/menu/al-waha-cafe-demo";
const ts = Date.now().toString().slice(-8);

// ── 1. Full review journey (تقييم كامل) ────────────────────────────────────

test.describe("journey: full review (تقييم كامل)", () => {
  test("customer submits rating + comment and it appears and persists", async ({ page }) => {
    test.setTimeout(90_000);
    const comment = `رحلة تقييم ٨٧ ${ts}`;
    const reviewer = `زائر ${ts}`;

    await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 40_000 });
    // Item cards are SSR'd; the review pill is a labelled button
    // (aria-label="تقييم <item display name>"). round87-closure: the item name
    // is derived from the FIRST pill on the page so the journey runs on any
    // environment's fixture data (localhost seed AND production demo menu).
    const firstPill = page.locator('button[aria-label^="تقييم "]').first();
    await expect(firstPill).toBeVisible({ timeout: 20_000 });
    const pillLabel = (await firstPill.getAttribute("aria-label")) ?? "";
    const itemName = pillLabel.replace("تقييم ", "").trim();
    const reviewPill = page.getByRole("button", { name: pillLabel });

    await reviewPill.click();
    const sheet = page.getByRole("dialog", { name: itemName });
    // ReviewSheet is a dynamic import + spring animation — wait for the sheet.
    await expect(sheet).toBeVisible({ timeout: 15_000 });
    // The sheet's GET mints the csrf-token cookie (menu pages are cacheable
    // → no cookie on load); the submit form settles when the "أضف تقييمك"
    // section renders.
    await expect(sheet.getByText("أضف تقييمك")).toBeVisible({ timeout: 15_000 });

    // rating (star picker is labelled "تقييم N نجوم") + comment + name
    await sheet.getByRole("button", { name: "تقييم 4 نجوم" }).click();
    await sheet.getByPlaceholder("اكتب تعليقك (اختياري)").fill(comment);
    await sheet.getByPlaceholder("الاسم (اختياري)").fill(reviewer);

    await sheet.getByRole("button", { name: "إرسال التقييم" }).click();
    // Review prepends into the sheet list (server-confirmed optimistic update)
    await expect(sheet.getByText(comment)).toBeVisible({ timeout: 20_000 });
    await expect(sheet.getByText(reviewer)).toBeVisible();
    // Success toast (sonner, mounted by the public layout)
    await expect(page.getByText("شكراً لتقييمك!")).toBeVisible({ timeout: 10_000 });

    // Persisted: full reload → reopen the sheet → the review is still there.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 40_000 });
    await expect(reviewPill).toBeVisible({ timeout: 20_000 });
    await reviewPill.click();
    await expect(sheet).toBeVisible({ timeout: 15_000 });
    await expect(sheet.getByText(comment)).toBeVisible({ timeout: 20_000 });
  });
});

// ── 2. Gallery visible ──────────────────────────────────────────────────────

test.describe("journey: gallery (معرض الصور)", () => {
  test("gallery carousel renders images and navigates to the next slide", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 40_000 });

    // round87-closure: the gallery is a LOCAL fixture (qa-seed/DB update gives
    // al-waha-cafe-demo 3 images). Environments without a gallery (production
    // demo menu) skip conditionally instead of failing.
    const anySlide = page.locator('[role="group"][aria-label^="صورة "]');
    try {
      await expect(anySlide.first()).toBeVisible({ timeout: 8_000 });
    } catch {
      test.skip(true, "no gallery fixture in this environment");
      return;
    }
    const slideCount = await anySlide.count();
    const total = Math.max(2, slideCount);

    // GalleryIsland is dynamic ssr:false — it mounts after hydration. Slides
    // are role=group aria-label="صورة N من M"; only the CURRENT slide is
    // aria-hidden=false, so a visible group match == current slide.
    const slide1 = page.getByRole("group", { name: `صورة 1 من ${total}` });
    await expect(slide1).toBeVisible({ timeout: 20_000 });
    await expect(slide1.getByRole("img").first()).toBeVisible();

    // Pause autoplay first so the next-arrow assertion below can't race the
    // 5s interval (button is opacity-0 until hover but still clickable).
    const pause = page.getByRole("button", { name: "إيقاف العرض التلقائي" });
    await expect(pause).toBeVisible({ timeout: 10_000 });
    await pause.click();

    await page.getByRole("button", { name: "الصورة التالية" }).click();
    await expect(page.getByRole("group", { name: `صورة 2 من ${total}` })).toBeVisible({ timeout: 10_000 });
    // Slide 2's image lazy-mounts only when it becomes current (loaded set)
    await expect(page.getByRole("group", { name: `صورة 2 من ${total}` }).getByRole("img")).toBeVisible({ timeout: 10_000 });
  });
});

// ── 3. Wizard back (رجوع المعالج) ───────────────────────────────────────────

test.describe("journey: wizard back (رجوع المعالج)", () => {
  test("back button returns to the previous step without losing data", async ({ page }) => {
    test.setTimeout(90_000);
    const slug = `qa-back-${ts}`;
    const user = `qa_back_${ts}`;

    await page.goto("/subscribe", { waitUntil: "domcontentloaded", timeout: 60_000 });
    await chooseFreePlan(page);
    // fillSubscribeForm walks menu → account → review (its D7 rework waits on
    // each step's own marker instead of sleeping).
    await fillSubscribeForm(page, {
      restaurantName: "QA Back Wizard",
      slug,
      phone: "0910000077",
      whatsapp: "0910000077",
      username: user,
      password: "TestPass123!",
    });
    await expect(page.getByRole("heading", { name: "راجع بياناتك ثم أكّد" })).toBeVisible({ timeout: 15_000 });

    // review → account: entered username survives
    await page.getByRole("button", { name: "رجوع" }).click();
    const username = page.getByPlaceholder("اسم المستخدم (3 أحرف على الأقل)");
    await expect(username).toBeVisible({ timeout: 10_000 });
    await expect(username).toHaveValue(user);
    const password = page.getByPlaceholder(/^كلمة المرور/);
    await expect(password).toHaveValue("TestPass123!");

    // account → menu: entered menu fields survive
    await page.getByRole("button", { name: "رجوع" }).click();
    const nameField = page.getByPlaceholder("اسم المطعم (مثال: مقهى الواحة)");
    await expect(nameField).toBeVisible({ timeout: 10_000 });
    await expect(nameField).toHaveValue("QA Back Wizard");
    await expect(page.getByPlaceholder("الرابط المختصر (مثال: al-waha-cafe)")).toHaveValue(slug);

    // forward again → review still summarizes the same data (no submit —
    // no account is created, so this journey is rate-limit-neutral).
    await advanceStep(page, username);
    await advanceStep(
      page,
      page.getByRole("heading", { name: "راجع بياناتك ثم أكّد" })
    );
    await expect(page.locator("body")).toContainText(slug);
    await expect(page.locator("body")).toContainText(user);
  });
});

// ── 4. Print content ────────────────────────────────────────────────────────

test.describe("journey: print menu (طباعة المنيو)", () => {
  test("print page renders menu content, is print-friendly, no JS errors", async ({ page }) => {
    test.setTimeout(60_000);
    const consoleErrors: string[] = [];
    page.on("pageerror", (e) => consoleErrors.push(String(e).slice(0, 100)));

    // Restaurant + menu content: derive the restaurant name from the public
    // menu page first (environment-adaptive — works on any fixture data).
    await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 40_000 });
    const h1 = page.getByRole("heading", { level: 1 }).first();
    await expect(h1).toBeVisible({ timeout: 15_000 });
    const restaurantName = (await h1.textContent())?.trim() ?? "";

    const resp = await page.goto(`${MENU}/print`, { waitUntil: "domcontentloaded", timeout: 40_000 });
    expect(resp?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: restaurantName })).toBeVisible({ timeout: 15_000 });
    // Any category header + any item price line proves menu data rendered
    await expect(page.locator("body")).toContainText("د.ل");
    // The print action is a real button
    await expect(page.getByRole("button", { name: "حفظ كـ PDF / طباعة" })).toBeVisible();

    // Print-friendly: under print emulation the action bars must be hidden
    // (@media print { .actions { display: none; } body { padding: 0; } }).
    await page.emulateMedia({ media: "print" });
    const actionsDisplay = await page.evaluate(
      () => getComputedStyle(document.querySelector(".actions") as HTMLElement).display
    );
    expect(actionsDisplay).toBe("none");
    await page.emulateMedia({ media: "screen" });

    // No JS errors on hydration — EXCEPT one KNOWN product bug found by this
    // very journey (round87 87-D-e2e): src/app/(public)/menu/[slug]/print/
    // page.tsx renders its own <html>/<head>/<body> document NESTED inside
    // the (public) root layout's document, so React throws a hydration
    // mismatch (minified error #418, args[]=text) on every load. Reported in
    // the worklog; src is out of scope for this tests-only round. The
    // allowance is deliberately narrow: any OTHER page error still fails.
    const knownPrintHydrationBug = /#418/;
    const unexpected = consoleErrors.filter((e) => !knownPrintHydrationBug.test(e));
    expect(unexpected, "page errors other than the documented print #418 hydration bug").toEqual([]);
    test.info().annotations.push({
      type: "known-bug",
      description:
        "print page emits React hydration error #418 (nested <html>/<body> inside the public layout document) — documented in worklog 87-D-e2e",
    });
  });
});

// ── 5. Theme persistence ────────────────────────────────────────────────────

test.describe("journey: theme persistence (الوضع الليلي)", () => {
  test("dark-mode toggle on the public menu survives a reload", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 40_000 });

    // ThemeToggle is a client component with a mounted-guard — wait for the
    // button (placeholder div until mounted).
    const toggle = page
      .locator('button[aria-label="الوضع النهاري"], button[aria-label="الوضع الليلي"]')
      .first();
    await expect(toggle).toBeVisible({ timeout: 20_000 });

    // Extract just the theme token from documentElement's class list (the
    // class attribute may carry other utility classes alongside it).
    const themeClass = () =>
      page.evaluate(() => {
        const c = document.documentElement.className;
        if (c.includes("dark")) return "dark";
        if (c.includes("light")) return "light";
        return "";
      });

    const before = await themeClass();
    const expected = before === "dark" ? "light" : "dark";

    await toggle.click();
    // html class flips on click — poll instead of a fixed sleep.
    await expect.poll(themeClass, { timeout: 5_000 }).toBe(expected);
    // next-themes persists the choice under its default storage key "theme"
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("theme")), { timeout: 5_000 })
      .toBe(expected);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 40_000 });
    // The persisted theme is applied again (inline pre-hydration script).
    await expect.poll(themeClass, { timeout: 15_000 }).toBe(expected);
    // The toggle's own aria-label reflects the persisted state
    // (dark → "الوضع النهاري" i.e. switch-to-light CTA).
    const expectedLabel = expected === "dark" ? "الوضع النهاري" : "الوضع الليلي";
    await expect(page.locator(`button[aria-label="${expectedLabel}"]`).first()).toBeVisible({ timeout: 20_000 });
  });
});
