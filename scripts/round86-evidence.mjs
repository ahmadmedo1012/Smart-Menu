/** Round 86 closure — production evidence screenshots (menu page, both themes). */
import { chromium } from "@playwright/test";

const BASE = "https://menu.smart-link.ly";
const OUT = new URL("../../download/round86-evidence/", import.meta.url).pathname;
import { mkdirSync } from "node:fs";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      storageState: {
        cookies: [],
        origins: [{ origin: BASE, localStorage: [{ name: "theme", value: theme }] }],
      },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/menu/al-waha-cafe`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/menu-${theme}-1440.png` });
    console.log(`captured menu-${theme}-1440.png`);
    await context.close();
  }
  // landing too (B-phase touched nothing there, but evidence of healthy hero)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/home-light-1440.png` });
  console.log("captured home-light-1440.png");
  await ctx.close();
} finally {
  await browser.close();
}
