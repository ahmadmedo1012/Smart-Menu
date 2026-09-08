/** Round 87 closure — production evidence: menu both themes, minimal 404 (B5), print page. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "https://menu.smart-link.ly";
const OUT = "/home/z/my-project/download/round87-evidence/";
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
    await page.goto(`${BASE}/menu/al-waha-cafe-demo`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/menu-${theme}-1440.png` });
    console.log(`captured menu-${theme}-1440.png`);
    await context.close();
  }
  // B5 evidence: the root 404 now renders a minimal Link-based header
  const ctx404 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p404 = await ctx404.newPage();
  await p404.goto(`${BASE}/round87-not-found-probe`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await p404.waitForTimeout(1200);
  await p404.screenshot({ path: `${OUT}/404-minimal-header.png` });
  console.log("captured 404-minimal-header.png");
  await ctx404.close();
  // Print page (round87 journey validated live)
  const ctxP = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const pP = await ctxP.newPage();
  await pP.goto(`${BASE}/menu/al-waha-cafe-demo/print`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await pP.waitForTimeout(1200);
  await pP.screenshot({ path: `${OUT}/print-page.png` });
  console.log("captured print-page.png");
  await ctxP.close();
} finally {
  await browser.close();
}
