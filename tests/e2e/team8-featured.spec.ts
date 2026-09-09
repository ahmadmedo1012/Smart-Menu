/**
 * Team 8 — Featured toggle journey (الميزة المميزة — isFeatured).
 *
 * Journey: login as waha_owner → open the item editor in /owner/menu →
 * flip the "عرض في قسم الأصناف المميزة" switch → save → the cinematic
 * showcase section on the public menu (/menu/al-waha-cafe) gains/loses
 * the scene, and the featured pill in the owner list follows.
 *
 * Uses the round83-seed fixture (al-waha-cafe: Caramel Latte is featured
 * rank 1 → its scene is the FIRST one shown on load, so no carousel
 * navigation is needed to observe the toggle; Waha Burger rank 2 becomes
 * scene 1 the moment the latte leaves).
 *
 * localhost-only by design (owner writes are destructive on production
 * fixtures): requires the round83 seed (waha_owner / al-waha-cafe).
 * Run: npx playwright test tests/e2e/team8-featured.spec.ts --project=qa-teams
 *
 * round88-C3: ACTIVATED (was PENDING WAVE-C). The isFeatured editor chain
 * was verified complete this wave (editor switch → PUT persists → public
 * showcase) — this team is the permanent regression guard for the feature
 * (and now also guards the round88-C showcaseTag drop: badges render from
 * the showcaseTags array only).
 */
import { test, expect, type Page, type Locator } from "@playwright/test";
import { login as qaLogin, loginBudget } from "./qa-helpers";

const OWNER = "waha_owner";
const PASS = "waha123456";
const MENU = "/menu/al-waha-cafe";
const CATEGORY = "Hot Drinks";
const ITEM = "Caramel Latte"; // seeded featured, rank 1 → scene 1 on load
const ITEM_AR = "لاتيه كراميل"; // showcase display name (nameAr wins)
const NEXT_RANK1_AR = "برجر الواحة"; // Waha Burger — rank 2, becomes scene 1 when latte is off

async function ownerLogin(page: Page) {
  test.setTimeout(loginBudget());
  await qaLogin(page, OWNER, PASS);
  // Retry once if rate-limited (429 → stays on login)
  if (!page.url().includes("/owner")) {
    await page.waitForTimeout(3000);
    await qaLogin(page, OWNER, PASS);
  }
  expect(page.url()).toContain("/owner");
}

/** The owner-menu row of a specific item (rows live under div.divide-y). */
function itemRow(page: Page, item: string): Locator {
  return page
    .locator("div.divide-y > div", { has: page.locator(`span:text-is("${item}")`) })
    .first();
}

/** The featured pill rendered next to featured item names in the owner list. */
function featuredPill(row: Locator): Locator {
  return row.locator('span[title^="مميز"]');
}

/** Navigate to the menu editor and locate an item's row (expanding its category). */
async function gotoEditorRow(page: Page, item: string): Promise<Locator> {
  await page.goto("/owner/menu", { waitUntil: "domcontentloaded" });
  const catHeader = page.locator("div.cursor-pointer", { hasText: CATEGORY }).first();
  await expect(catHeader).toBeVisible({ timeout: 20_000 });
  const row = itemRow(page, item);
  // Categories start collapsed — expand ours if the row isn't rendered yet.
  if (!(await row.isVisible().catch(() => false))) {
    await catHeader.click();
  }
  await expect(row).toBeVisible({ timeout: 10_000 });
  return row;
}

/**
 * Read the dialog's featured switch state.
 *
 * round88-C3 discovery (the spec was never run before — PENDING WAVE-C):
 * base-ui moves #item-featured-switch onto the visually-hidden NATIVE
 * checkbox input it renders for label association; the visible Root keeps
 * aria-checked/data-checked but NOT the id. Reading aria-checked on the id
 * element therefore always returns false. The hidden input's `.checked`
 * property is the reliable state mirror.
 */
async function switchChecked(sw: Locator): Promise<boolean> {
  return sw.evaluate((el) => (el as HTMLInputElement).checked);
}

/**
 * Toggle the featured switch to the wanted state.
 *
 * The hidden input is clip-path'd to nothing and pointer-intercepted by the
 * dialog overlay (direct clicks hang — verified live), but its associated
 * LABEL (for="item-featured-switch") forwards clicks natively — that is the
 * accessible, deterministic toggle path. State flip is awaited before return.
 */
async function toggleFeatured(page: Page, want: boolean): Promise<void> {
  const dialog = page.getByRole("dialog");
  const sw = dialog.locator("#item-featured-switch");
  if ((await switchChecked(sw)) === want) return;
  await dialog.getByText("عرض في قسم الأصناف المميزة").click();
  await expect
    .poll(() => switchChecked(sw), { timeout: 5000 })
    .toBe(want);
}

/** Open the edit dialog for an item and return its featured switch. */
async function openEditor(page: Page, item: string): Promise<{ dialog: Locator; sw: Locator }> {
  const row = await gotoEditorRow(page, item);
  await row.locator('button[title="تعديل"]').click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await expect(dialog.locator("text=تعديل صنف")).toBeVisible();
  const sw = dialog.locator("#item-featured-switch");
  await expect(sw).toBeVisible({ timeout: 10_000 });
  return { dialog, sw };
}

/** Flip the switch to the wanted state and save (waits on the success toast). */
async function setFeatured(page: Page, item: string, want: boolean): Promise<void> {
  const { dialog, sw } = await openEditor(page, item);
  expect(await switchChecked(sw)).toBeDefined();
  await toggleFeatured(page, want);
  await dialog.getByRole("button", { name: "تحديث" }).click();
  await expect(page.getByText("تم تحديث الصنف")).toBeVisible({ timeout: 20_000 });
  await expect(dialog).not.toBeVisible({ timeout: 10_000 });
}

/** The public menu's showcase scene name (h3 of the CURRENT scene). */
function sceneName(page: Page): Locator {
  return page
    .locator('section[aria-labelledby="featured-showcase-heading"]')
    .getByRole("heading", { level: 3 });
}

/**
 * Load the public menu and wait until the CURRENT showcase scene shows the
 * expected item. The items PUT calls revalidatePath (round85-B9) so the edit
 * is live immediately; the bounded reload loop only covers the fire-and-forget
 * ISR edge where the very first paint raced the purge.
 */
async function gotoMenuExpectScene(page: Page, nameAr: string): Promise<void> {
  await page.goto(MENU, { waitUntil: "domcontentloaded", timeout: 40_000 });
  /* r97 (W6e — تشخيص نهائي): بعد domcontentloaded قد تتعايش مؤقتًا نسخة
     خادم مخفية (حاوية بث S:0 قبل $RC أو أثناء استعادة React لعدم تطابق
     الماء) مع نسخة العميل — نافذة <~200ms تُحل ذاتيًا (أثبتته أدوات
     متعددة: querySelectorAll أثناء «انتهاك الصرامة» يرى نسخة واحدة،
     شجرة a11y نظيفة، HTML المُقدَّم نظيف، DOM بعد الاستقرار نظيف).
     أجهزة CI الأبطأ توسّع النافذة فيصطدم بها الـstrict locator — ننتظر
     الاستقرار (نسخة واحدة) قبل التوكيد الصارم؛ الـtoBeVisible بعدها لا
     يرى إلا الشجرة النهائية. */
  await page
    .waitForFunction(
      () =>
        document.querySelectorAll(
          'section[aria-labelledby="featured-showcase-heading"]'
        ).length === 1,
      undefined,
      { timeout: 15_000, polling: 120 }
    )
    .catch(() => {});
  // r97 diagnostic: عند «بطاقتان — واحدة مخفية» نُفِش سلسلة أسلاف كل نسخة
  // في سجل الفشل — يكشف مصدر النسخة الخفية إن عاد السباق بصورة جديدة.
  try {
    await expect(
      page.locator('section[aria-labelledby="featured-showcase-heading"]')
    ).toBeVisible({ timeout: 20_000 });
  } catch (e) {
    const dupes = await page
      .evaluate(() =>
        Array.from(
          document.querySelectorAll(
            'section[aria-labelledby="featured-showcase-heading"]'
          )
        ).map((el) => {
          const chain: string[] = [];
          let cur = el.parentElement;
          for (let i = 0; cur && i < 7; i++, cur = cur.parentElement) {
            chain.push(
              `${cur.tagName.toLowerCase()}#${cur.id || "-"}${(cur.className || "")
                .toString()
                .split(" ")
                .slice(0, 3)
                .join(".")}`
            );
          }
          const cs = getComputedStyle(el);
          return {
            hiddenAttr: el.hidden,
            visibility: cs.visibility,
            display: cs.display,
            box: `${el.offsetWidth}x${el.offsetHeight}`,
            ancestorChain: chain,
            html: el.outerHTML.slice(0, 120),
          };
        })
      )
      .catch(() => null);
    console.error(
      `DIAGNOSTIC duplicate-sections (${dupes?.length ?? "?"} found):`,
      JSON.stringify(dupes, null, 1)
    );
    throw e;
  }
  await expect
    .poll(
      async () => {
        const txt = (await sceneName(page).textContent().catch(() => null))?.trim();
        if (txt && txt.includes(nameAr)) return true;
        await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
        return false;
      },
      { timeout: 30_000 }
    )
    .toBe(true);
}

test.describe("team8: isFeatured editor toggle → public showcase badge", () => {
  // round92: these two tests are ORDER-COUPLED — 159 mutates the latte's
  // featured flag (off→on, restoring the seed at the end) while 195 asserts
  // the SEEDED state. Under fullyParallel + workers=2 they ran concurrently:
  // 195's single-shot switch read caught 159's mid-flight OFF phase (coin
  // flip, historically masked by CI retries=2 — surfaced deterministically
  // once the ISR fix shifted timings). Serial mode: 159 completes (ends
  // restored ON) before 195 starts — same pattern round79 declared.
  test.describe.configure({ mode: "serial" });

  test(
    "toggle OFF removes the scene from the public showcase; toggle ON restores it",
    async ({ page }) => {
      test.setTimeout(240_000);

      // ── pre-state: seeded fixture — latte is featured rank 1 (scene 1) ──
      await gotoMenuExpectScene(page, ITEM_AR);

      // ── login once; the session cookie covers every later /owner visit ──
      await ownerLogin(page);
      // the login helper sets its own 270s budget; extend for the full
      // round-trip journey (2 editor saves + 3 public-menu verifications)
      test.setTimeout(330_000);

      // owner sees the featured pill on the item row
      const row1 = await gotoEditorRow(page, ITEM);
      await expect(featuredPill(row1)).toBeVisible({ timeout: 10_000 });

      // ── toggle OFF → the public showcase loses the latte (burger becomes scene 1) ──
      await setFeatured(page, ITEM, false);
      await gotoMenuExpectScene(page, NEXT_RANK1_AR);

      // owner list: the pill is gone
      const row2 = await gotoEditorRow(page, ITEM);
      await expect(featuredPill(row2)).toHaveCount(0);

      // ── toggle ON → latte returns as scene 1 (rank 1 wins the ordering) ──
      await setFeatured(page, ITEM, true);
      await gotoMenuExpectScene(page, ITEM_AR);

      // owner list: the pill is back
      const row3 = await gotoEditorRow(page, ITEM);
      await expect(featuredPill(row3)).toBeVisible({ timeout: 10_000 });
    }
  );

  test(
    "editor switch mirrors the STORED flag (featured item reads back on, unfeatured off)",
    async ({ page }) => {
      test.setTimeout(180_000);
      await ownerLogin(page);

      // Caramel Latte IS seeded featured — the switch must read back TRUE
      // (the .checked mirror — see switchChecked).
      {
        const { sw } = await openEditor(page, ITEM);
        expect(await switchChecked(sw)).toBe(true);
      }

      // Moroccan Tea is seeded NOT featured — the switch must read back off.
      {
        const { sw } = await openEditor(page, "Moroccan Tea");
        expect(await switchChecked(sw)).toBe(false);
      }
    }
  );
});
