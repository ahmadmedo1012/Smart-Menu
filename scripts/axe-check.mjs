/**
 * axe-core accessibility check for Smart Menu.
 * Usage: node scripts/axe-check.mjs [baseUrl]
 * Visits /login and /menu/al-waha-cafe, injects axe-core from node_modules,
 * runs the full rule set and prints violations grouped by impact.
 */
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const axeSource = readFileSync(
  path.join(root, 'node_modules/axe-core/axe.min.js'),
  'utf8'
);
const BASE = process.argv[2] || 'http://localhost:3000';
const PAGES = [
  { name: '/login', url: `${BASE}/login` },
  { name: '/menu/al-waha-cafe', url: `${BASE}/menu/al-waha-cafe` },
];

const browser = await chromium.launch();
const context = await browser.newContext({ locale: 'ar' });
// Give menu images time to settle so lazy content is present before scanning.
context.setDefaultTimeout(30_000);

for (const target of PAGES) {
  const page = await context.newPage();
  try {
    await page.goto(target.url, { waitUntil: 'networkidle', timeout: 60_000 });
  } catch {
    // networkidle can time out on pages with polling — proceed after load
    console.log(`(networkidle timeout on ${target.name}, continuing)`);
  }
  await page.waitForTimeout(2500);

  await page.addScriptTag({ content: axeSource });
  const results = await page.evaluate(async () => {
    const r = await window.axe.run(document, {
      resultTypes: ['violations'],
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      sampleTargets: v.nodes.slice(0, 4).map((n) => n.target.join(' > ')),
    }));
  });

  console.log(`\n===== ${target.name} =====`);
  if (results.length === 0) {
    console.log('No axe violations.');
  } else {
    for (const v of results) {
      console.log(`[${v.impact || 'unknown'}] ${v.id} (${v.nodes} nodes): ${v.help}`);
      for (const t of v.sampleTargets) console.log(`    ${t}`);
    }
  }
  await page.close();
}

await browser.close();
