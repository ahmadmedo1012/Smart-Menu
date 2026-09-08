/**
 * Round 86 closure (E3) — axe WCAG A/AA sweep on PRODUCTION public pages,
 * light + dark, after the B-phase menu refactor (B5/B6/B7/B12).
 * Round-84 methodology: two viewports, full scroll to reveal lazy content,
 * resting state before scan (avoid animation-measurement flakiness).
 */
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const BASE = "https://menu.smart-link.ly";
const PAGES = ["/", "/pricing", "/menu/al-waha-cafe"];
const THEMES = ["light", "dark"];
const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "desktop", width: 1440, height: 900 },
];

const AXE_SOURCE = readFileSync(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");

let totalViolations = 0;
const findings = [];

const browser = await chromium.launch();
try {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        // seed next-themes before any app JS runs (attribute="class", storageKey default "theme")
        storageState: {
          cookies: [],
          origins: [
            {
              origin: BASE,
              localStorage: [{ name: "theme", value: theme === "dark" ? "dark" : "light" }],
            },
          ],
        },
      });
      const page = await context.newPage();
      for (const path of PAGES) {
        const label = `${theme}/${vp.name}${path}`;
        try {
          await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 45000 });
          await page.waitForTimeout(1500); // resting state — avoid mid-animation scans

          // full scroll to reveal lazy-mounted sections, then back to top + settle
          await page.evaluate(async () => {
            const step = window.innerHeight;
            for (let y = 0; y <= document.body.scrollHeight; y += step) {
              window.scrollTo(0, y);
              await new Promise((r) => setTimeout(r, 120));
            }
            window.scrollTo(0, 0);
            await new Promise((r) => setTimeout(r, 600));
          });

          await page.evaluate(AXE_SOURCE);
          const report = await page.evaluate(async () => {
            const r = await window.axe.run(document, {
              runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
            });
            return r.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.length,
              help: v.help,
              sample: v.nodes[0]?.target?.join(" ")?.slice(0, 90) ?? "",
            }));
          });

          if (report.length === 0) {
            console.log(`  ✅ ${label}: 0 violations`);
          } else {
            const count = report.reduce((s, v) => s + v.nodes, 0);
            totalViolations += count;
            console.log(`  ❌ ${label}: ${count} nodes / ${report.length} rules`);
            for (const v of report) {
              console.log(`       ${v.impact ?? "?"} | ${v.id} | ${v.nodes}× | ${v.sample}`);
              findings.push(`${label}: ${v.id} (${v.impact}) ×${v.nodes} — ${v.sample}`);
            }
          }
        } catch (e) {
          totalViolations += 1;
          console.log(`  ⚠️ ${label}: scan error ${String(e).slice(0, 120)}`);
          findings.push(`${label}: scan error ${String(e).slice(0, 120)}`);
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(`\n=== AXE SWEEP RESULT: ${totalViolations === 0 ? "CLEAN — 0 violations (WCAG A/AA)" : `${totalViolations} violation nodes`} ===`);
if (findings.length) {
  console.log(findings.join("\n"));
  process.exit(1);
}
