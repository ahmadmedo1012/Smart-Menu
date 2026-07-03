import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.launch({
    headless: true,
  });
  const pages = ["/", "/pricing", "/login", "/subscribe", "/menu/al-waha-cafe"];
  const base = "https://smart-menu-sigma.vercel.app";

  for (const p of pages) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors: string[] = [];
    const warnings: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
      if (msg.type() === "warning") warnings.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));

    try {
      await page.goto(`${base}${p}`, { waitUntil: "networkidle", timeout: 20000 });
      await page.waitForTimeout(1000);
      console.log(`\n=== ${p} ===`);
      if (errors.length) console.log(`  ERRORS (${errors.length}):`, errors.join("\n    "));
      else console.log("  Console errors: NONE");
      if (warnings.length) console.log(`  Warnings (${warnings.length}):`, warnings.slice(0,3).join("\n    "));
      console.log(`  Title: ${await page.title()}`);
    } catch (e: any) {
      console.log(`  FAILED: ${e.message.slice(0, 100)}`);
    }
    await context.close();
  }
  await browser.close();
}

main().catch(console.error);
