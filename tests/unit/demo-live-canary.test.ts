/**
 * P42 (Wave-1 fix 6) — the LIVE demo canary: both public demo tenants must
 * render clean of test artifacts.
 *
 * WHY THIS EXISTS: the repo-side guard (tests/unit/demo-content-guard.test.ts)
 * sweeps STATIC seed sources — it stayed green the whole time the LIVE pages
 * https://menu.smart-link.ly/menu/al-waha-cafe and /menu/al-waha-cafe-demo
 * carried «TestLimitItem» and «كابتشينو اختبار 2» (items 712/767/778/779,
 * created from the owner dashboard straight into the production DB — zero
 * repo sources to sweep). No guard fetched the live pages; this canary is
 * that guard, and it is the alarm for any future owner-dashboard
 * contamination of the public demos.
 *
 * WHERE IT RUNS: the NIGHTLY workflow only
 * (.github/workflows/nightly-flake.yml → LIVE_DEMO_CANARY=1). A plain
 * `pnpm test` skips it — the unit army stays hermetic/offline, and network
 * flakiness never blocks the main CI gate (the nightly-flake conventions:
 * network-facing checks live in the nightly, not in the push gate).
 *
 * THE POST-CHECK CONTRACT mirrors the owner runbook
 * (docs/runbooks/demo-content-cleanup.md): HTTP 200, then zero occurrences
 * of the two live-artifact vocabularies in the delivered HTML.
 */
import { describe, it, expect } from 'vitest';

/* Env gate — only the nightly workflow opts in. */
const RUN_LIVE = process.env.LIVE_DEMO_CANARY === '1';

const DEMO_PAGES = [
        'https://menu.smart-link.ly/menu/al-waha-cafe',
        'https://menu.smart-link.ly/menu/al-waha-cafe-demo',
] as const;

/* The same banned vocabulary the static guard + the runbook post-check use:
 * the English test artifact and the Arabic test-word family. «تجريبي» is NOT
 * banned — it is the honest demo-labeling vocabulary. */
const BANNED = [
        {
                needle: 'TestLimitItem',
                why: 'صنف اختبار الحدّ الإنجليزي — الأثر الحيّ الموثّق (P40/P42)',
        },
        {
                needle: 'اختبار',
                why: 'عائلة كلمة الاختبار — أصناف الديمو العام طعام حقيقي، لا أدوات قياس',
        },
] as const;

describe.skipIf(!RUN_LIVE)('P42 — الديمو العام الحيّ خالٍ من أصناف الاختبار (canary)', () => {
        for (const url of DEMO_PAGES) {
                it(`${url} — يجب أن يجيب 200 وبلا أي أثر لأصناف الاختبار`, async () => {
                        const res = await fetch(url, {
                                headers: { 'user-agent': 'smart-menu-demo-canary/1.0 (+nightly)' },
                                redirect: 'follow',
                                signal: AbortSignal.timeout(30_000),
                        });
                        expect(
                                res.status,
                                `صفحة الديمو العامة يجب أن تجيب 200 — تلقّينا ${res.status} من ${url}`,
                        ).toBe(200);
                        const html = await res.text();
                        expect(
                                html.length,
                                `الصفحة رجعت شبه فارغة (${html.length} حرفًا) — لا يمكن التحقق من نظافة الديمو: ${url}`,
                        ).toBeGreaterThan(1000);
                        for (const { needle, why } of BANNED) {
                                const hits = html.split(needle).length - 1;
                                expect(
                                        hits,
                                        `تلوث مؤكّد في الديمو العام: «${needle}» ظهر ${hits} مرة في ${url} (${why}). ` +
                                                'الصفحة معروضة للزوار — نفّذ دليل التنظيف docs/runbooks/demo-content-cleanup.md ثم أعد تشغيل هذا الاختبار',
                                ).toBe(0);
                        }
                }, 60_000);
        }
});
