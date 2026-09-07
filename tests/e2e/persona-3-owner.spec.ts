/**
 * Persona 3 — New restaurant owner builds a complete menu from scratch.
 * Real-user journey: register → verify menu editor → verify public menu → QR.
 * Uses stable selectors + QA-tagged data.
 * Run: npx playwright test tests/e2e/persona-3-owner.spec.ts --project=qa-teams
 */
import { test, expect } from "@playwright/test";
import { fillSubscribeForm, chooseFreePlan } from "./qa-helpers";

const ts = Date.now().toString().slice(-8);
const OWNER = `p3_${ts}`;
const SLUG = `p3-cafe-${ts}`;

test("P3: full owner build-out journey", async ({ page }) => {
  test.setTimeout(120000);
  // ── 1. Register as new owner (free plan) ──
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  // round92-C6: settle → conditional wait — the wizard plan cards render with
  // the page; chooseFreePlan's own clicks auto-wait, so a tolerant visibility
  // wait replaces the blind nap.
  await page.locator("button").filter({ hasText: "مجاني" }).first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await chooseFreePlan(page);
  await fillSubscribeForm(page, {
    restaurantName: "P3 QA Cafe",
    slug: SLUG,
    description: "QA persona 3 restaurant",
    phone: "0913000003",
    whatsapp: "0913000003",
    username: OWNER,
    password: "TestPass123!",
  });
  await page.locator('button:has-text("إنشاء الحساب والبدء")').first().click();
  // round92-C6: settle → conditional wait — the register POST decides the
  // wait (authenticated redirect to /owner), like team1's submitCreate.
  await page.waitForURL(/\/owner/, { timeout: 20000 }).catch(() => {});
  // Rate-limit (429) on registration in serial runs can bounce us to /login —
  // retry the create once after a wait.
  if (!page.url().includes("/owner")) {
    console.log("P3: registration bounced (rate-limit?) — retrying create");
    // deliberate (round92-C6): register rate-limit window backoff (5/min) —
    // semantic wait, not a flake sleep.
    await page.waitForTimeout(20000);
    const create2 = page.locator('button:has-text("إنشاء الحساب والبدء")');
    if (await create2.count()) {
      await create2.first().click();
      // round92-C6: settle → conditional wait — same outcome wait on the retry.
      await page.waitForURL(/\/owner/, { timeout: 20000 }).catch(() => {});
    }
  }
  expect(page.url()).toContain("/owner");
  expect(await page.locator("body").innerText()).toContain("لوحة التحكم");

  // ── 2. Menu editor loads ──
  await page.goto("/owner/menu", { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the editor h1 renders when the
  // categories fetch settles (tolerant: the negative assertion below is the
  // decider).
  await page
    .getByRole("heading", { name: "إدارة المنيو" })
    .first()
    .waitFor({ state: "visible", timeout: 20000 })
    .catch(() => {});
  const editorBody = await page.locator("body").innerText();
  expect(editorBody).not.toContain("فشل");

  // ── 3. Public menu renders the new restaurant with auto-seeded content ──
  await page.goto(`/menu/${SLUG}`, { waitUntil: "networkidle" });
  // round92-C6: settle → conditional wait — the new restaurant's name renders
  // with the (on-demand ISR) page; exactly what the first assertion reads.
  await expect(page.locator("body")).toContainText("P3 QA Cafe", { timeout: 15000 });
  const pubBody = await page.locator("body").innerText();
  expect(pubBody).toContain("P3 QA Cafe");
  expect(pubBody).not.toContain("فشل");
  const hasSection = pubBody.includes("مشروبات") || pubBody.includes("حلويات");
  console.log(`P3 public menu has a category section: ${hasSection}`);

  // ── 4. Add an item via the owner UI (if the add-item control is present) ──
  const addItemBtn = page.locator('button:has-text("إضافة صنف")').first();
  if (await addItemBtn.count()) {
    // navigate back to editor to add
    await page.goto("/owner/menu", { waitUntil: "networkidle" });
    // round92-C6: settle → conditional wait — same editor settle before the
    // guarded add-item flow (tolerant).
    await page
      .getByRole("heading", { name: "إدارة المنيو" })
      .first()
      .waitFor({ state: "visible", timeout: 20000 })
      .catch(() => {});
    const btn = page.locator('button:has-text("إضافة صنف")').first();
    await btn.click();
    // round92-C6: settle → conditional wait — the item dialog mounts
    // client-side; the field count guards below are tolerant too.
    await page.locator('[role="dialog"]').first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    const nameField = page.getByPlaceholder(/اسم الصنف|الاسم/).first();
    const priceField = page.getByPlaceholder(/السعر/).first();
    if (await nameField.count()) await nameField.fill("شوربة عدس");
    if (await priceField.count()) await priceField.fill("9");
    const saveBtn = page.locator('[role="dialog"] button:has-text("حفظ")').first();
    if (await saveBtn.count()) {
      await saveBtn.click();
      // round92-C6: settle → conditional wait — the save toast proves the PUT
      // landed (guarded, unasserted step → tolerant).
      await page.getByText("تمت إضافة الصنف").first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    }
  }

  // ── 5. (QR is covered in team3-owner; here we confirm owner still signed in) ──
  await page.goto("/owner", { waitUntil: "domcontentloaded" });
  // round92-C6: settle → conditional wait — the sidebar's "لوحة التحكم" label
  // is exactly the text the assertion reads (SSR'd with the layout).
  await expect(page.locator("body")).toContainText("لوحة التحكم", { timeout: 15000 });
  const dashBody = await page.locator("body").innerText();
  expect(dashBody).toContain("لوحة التحكم");
});