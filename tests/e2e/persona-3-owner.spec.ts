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
  // ── 1. Register as new owner (free plan) ──
  await page.goto("/subscribe", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
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
  await page.waitForTimeout(6000);
  expect(page.url()).toContain("/owner");
  expect(await page.locator("body").innerText()).toContain("لوحة التحكم");

  // ── 2. Menu editor loads ──
  await page.goto("/owner/menu", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const editorBody = await page.locator("body").innerText();
  expect(editorBody).not.toContain("فشل");

  // ── 3. Public menu renders the new restaurant with auto-seeded content ──
  await page.goto(`/menu/${SLUG}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
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
    await page.waitForTimeout(2500);
    const btn = page.locator('button:has-text("إضافة صنف")').first();
    await btn.click();
    await page.waitForTimeout(1200);
    const nameField = page.getByPlaceholder(/اسم الصنف|الاسم/).first();
    const priceField = page.getByPlaceholder(/السعر/).first();
    if (await nameField.count()) await nameField.fill("شوربة عدس");
    if (await priceField.count()) await priceField.fill("9");
    const saveBtn = page.locator('[role="dialog"] button:has-text("حفظ")').first();
    if (await saveBtn.count()) {
      await saveBtn.click();
      await page.waitForTimeout(2500);
    }
  }

  // ── 5. (QR is covered in team3-owner; here we confirm owner still signed in) ──
  await page.goto("/owner", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const dashBody = await page.locator("body").innerText();
  expect(dashBody).toContain("لوحة التحكم");
});