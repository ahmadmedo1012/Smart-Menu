/**
 * P42-5d (GAP-MENU-1) — the native advanced-analytics port, pinned from
 * the web source of truth on both fronts: the CLASSIFIER behavior (real
 * imports, not mocks) and the SURFACE contracts (raw-text pins — the
 * tests/design/parity + mobile-plan-limit precedent for mobile surfaces
 * no runner can mount: mobile ships no Jest/RTL/RNTL setup, documented in
 * mobile/tests/design/parity.mjs's header; its behaviors are covered by
 * tsc + eslint + the raw-text parity snapshot + the CI Metro/Hermes
 * export, and remain human-QA territory on the Wave-9 rebuild).
 *
 * WHAT GAP-MENU-1 WAS (the last big parity gap): the web owner dashboard
 * ships the «تحليلات» tab — /api/stats/advanced (server-gated by
 * requirePlanFeature 'advancedStats' → 403 with the feature-family copy)
 * behind the entitlements probe (/api/owner/entitlements →
 * features.advancedStats, the wasted-fetch avoidance) with PlanFeatureLock
 * as the honest lock (src/app/(protected)/owner/page.tsx:112-158, 439-450
 * + OwnerCharts.tsx:70-193). The native owner had NOTHING. The port:
 * mobile/src/screens/owner/OwnerAnalyticsScreen.tsx + the charts family +
 * this classifier (mobile/src/lib/plan-feature-gate.ts).
 *
 * THE CLASSIFIER CONTRACT (the second 403 family — feature gates):
 *   · the web planFeatureDeniedCopy builds the ONE family copy
 *     («هذه الميزة متوفرة في خطة «…» فأعلى. قم بالترقية للمتابعة.»);
 *   · the mobile classifier must lift minPlanName off the wire copy and
 *     recognize the advancedStats tier («بريميوم»);
 *   · the count-cap family (PlanLimitError — «لقد وصلت للحد الأقصى …
 *     قم بترقية خطتك لإضافة المزيد.») and the renewal gate
 *     («اشتراكك منتهي. جدّد اشتراكك للمتابعة.») must classify NOWHERE
 *     near it — in BOTH directions (each family's copy is the other's
 *     negative).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The WEB source builders — real imports, the port-faithful doctrine.
import { planFeatureDeniedCopy, PLAN_FEATURES } from '@/lib/plan-entitlements-core';
import { PlanLimitError } from '@/lib/plan-limit-error';
// The MOBILE classifiers — pure TS (zero RN imports) so the root suite can
// load them across the tree boundary.
import {
  classifyPlanFeatureGate,
  PLAN_FEATURE_ADVANCED_STATS,
} from '../../mobile/src/lib/plan-feature-gate';
import { classifyPlanLimit } from '../../mobile/src/lib/plan-limit';
import {
  peakOrdersPhrase,
  parseAnalyticsRange,
  dayLabel,
  hourLabel,
  seriesHasData,
} from '../../mobile/src/lib/analytics';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// ── 1. the classifier — web builder output → native classification ──────────

describe('P42-5d classifier — the web planFeatureDeniedCopy family, parsed off the wire', () => {
        it('classifies the WEB builder\'s own output for advancedStats (the port-faithful pin)', () => {
                // Built by the web core exactly as requirePlanFeature throws it
                // (api/stats/advanced/route.ts:48-49 → error(..., 403)), parsed
                // as the mobile client sees it: a 403 + the message string.
                const serverMessage = planFeatureDeniedCopy('advancedStats');
                expect(serverMessage).toBe('هذه الميزة متوفرة في خطة «بريميوم» فأعلى. قم بالترقية للمتابعة.');
                const out = classifyPlanFeatureGate({ status: 403, message: serverMessage });
                expect(out).not.toBeNull();
                expect(out?.feature).toBe('advancedStats');
                expect(out?.minPlanName).toBe('بريميوم');
                expect(out?.message).toBe(serverMessage);
        });

        it('parses the other features\' tiers (minPlanName lifted; feature null — two features share الاحترافية, the wire copy cannot disambiguate)', () => {
                for (const key of ['csvExport', 'referralProgram'] as const) {
                        const serverMessage = planFeatureDeniedCopy(key);
                        const out = classifyPlanFeatureGate({ status: 403, message: serverMessage });
                        expect(out, `feature ${key}: «${serverMessage}»`).not.toBeNull();
                        expect(out?.minPlanName).toBe(PLAN_FEATURES[key].minPlanNameAr);
                        // The tier matches TWO features — the classifier stays
                        // honest: it locks (the markers matched) without
                        // guessing which feature gated.
                        expect(out?.feature).toBeNull();
                }
        });

        it('classifies from the plain ApiError shape the mobile client throws', () => {
                const out = classifyPlanFeatureGate({
                        name: 'ApiError',
                        status: 403,
                        message: 'هذه الميزة متوفرة في خطة «بريميوم» فأعلى. قم بالترقية للمتابعة.',
                        details: undefined,
                });
                expect(out?.feature).toBe('advancedStats');
                expect(out?.minPlanName).toBe('بريميوم');
        });

        it('the advancedStats definition mirrors the web PLAN_FEATURES entry byte-for-byte (labelAr + minPlanNameAr)', () => {
                expect(PLAN_FEATURE_ADVANCED_STATS.minPlanNameAr).toBe(PLAN_FEATURES.advancedStats.minPlanNameAr);
                expect(PLAN_FEATURE_ADVANCED_STATS.labelAr).toBe(PLAN_FEATURES.advancedStats.labelAr);
        });
});

// ── 2. the family separation — negatives in BOTH directions ─────────────────

describe('P42-5d classifier — the three owner-side 403 families stay disjoint', () => {
        it('the COUNT-CAP family (web PlanLimitError output) never classifies as a feature gate', () => {
                for (const kind of ['orders', 'items', 'menus'] as const) {
                        const capErr = new PlanLimitError({ kind, limit: 10, planName: null });
                        expect(
                                classifyPlanFeatureGate({ status: 403, message: capErr.message }),
                                `kind ${kind}: «${capErr.message}»`
                        ).toBeNull();
                }
        });

        it('the FEATURE-GATE copy never classifies as a count cap (the reverse direction)', () => {
                const gateCopy = planFeatureDeniedCopy('advancedStats');
                expect(classifyPlanLimit({ status: 403, message: gateCopy })).toBeNull();
        });

        it('the RENEWAL gate classifies NOWHERE (different remedy)', () => {
                const renewal = 'اشتراكك منتهي. جدّد اشتراكك للمتابعة.';
                expect(classifyPlanFeatureGate({ status: 403, message: renewal })).toBeNull();
                expect(classifyPlanLimit({ status: 403, message: renewal })).toBeNull();
        });

        it('authorization refusals, non-403 statuses and single-marker copies never classify', () => {
                expect(classifyPlanFeatureGate({ status: 403, message: 'غير مصرح' })).toBeNull();
                // Same copy at 500 → not the gate family (the gate is 403-only).
                expect(classifyPlanFeatureGate({ status: 500, message: planFeatureDeniedCopy('advancedStats') })).toBeNull();
                // Prefix without the «للمتابعة» remedy → not this family.
                expect(classifyPlanFeatureGate({ status: 403, message: 'هذه الميزة متوفرة في خطة «بريميوم» فأعلى.' })).toBeNull();
                // The remedy clause without the feature prefix → not this family.
                expect(classifyPlanFeatureGate({ status: 403, message: 'قم بالترقية للمتابعة.' })).toBeNull();
                // Non-objects / missing message.
                expect(classifyPlanFeatureGate(null)).toBeNull();
                expect(classifyPlanFeatureGate('403')).toBeNull();
                expect(classifyPlanFeatureGate({ status: 403 })).toBeNull();
        });
});

// ── 3. the analytics client half — the web chart-stats twins, behavior ───────

describe('P42-5d analytics lib — the web chart-stats client twins', () => {
        it('peakOrdersPhrase serves the web OwnerCharts.tsx:32-40 outputs (the shared pluralizer)', () => {
                // The web phrase's own documented ladder: «طلب واحد / طلبان /
                // 5 طلبات / 12 طلبًا» — plus the CLDR boundaries the shared
                // arabic-plural pins (103 → few, 111 → many).
                expect(peakOrdersPhrase(1)).toBe('طلب واحد');
                expect(peakOrdersPhrase(2)).toBe('طلبان');
                expect(peakOrdersPhrase(5)).toBe('5 طلبات');
                expect(peakOrdersPhrase(12)).toBe('12 طلبًا');
                expect(peakOrdersPhrase(103)).toBe('103 طلبات');
                expect(peakOrdersPhrase(111)).toBe('111 طلبًا');
                expect(peakOrdersPhrase(0)).toBe('لا طلبات');
        });

        it('parseAnalyticsRange keeps the web default (unknown → week)', () => {
                expect(parseAnalyticsRange('today')).toBe('today');
                expect(parseAnalyticsRange('week')).toBe('week');
                expect(parseAnalyticsRange('month')).toBe('month');
                expect(parseAnalyticsRange('quarter')).toBe('week');
                expect(parseAnalyticsRange(null)).toBe('week');
        });

        it('dayLabel/hourLabel render the web formats (western digits, 24h zero-padded)', () => {
                expect(hourLabel(9)).toBe('09:00');
                expect(hourLabel(23)).toBe('23:00');
                expect(hourLabel(99)).toBe('23:00');
                // 2026-11-01 is a Sunday → «أحد 1».
                expect(dayLabel('2026-11-01')).toBe('أحد 1');
        });

        it('seriesHasData keeps the honest-empty doctrine (a zero-filled series is EMPTY)', () => {
                expect(seriesHasData([0, 0, 0])).toBe(false);
                expect(seriesHasData([0, 1, 0])).toBe(true);
                expect(seriesHasData([])).toBe(false);
        });
});

// ── 4. the surface contracts — raw-text pins, web bytes ↔ mobile bytes ──────

describe('P42-5d surfaces — the port-faithful copy + wiring (raw-text contracts)', () => {
        const webCharts = src('src/app/(protected)/owner/OwnerCharts.tsx');
        const webLock = src('src/components/shared/PlanFeatureLock.tsx');
        const webPage = src('src/app/(protected)/owner/page.tsx');
        const mobileScreen = src('mobile/src/screens/owner/OwnerAnalyticsScreen.tsx');
        const mobileLockCard = src('mobile/src/components/shared/PlanFeatureLockCard.tsx');
        const mobileStack = src('mobile/src/navigation/OwnerStack.tsx');
        const mobileNavTypes = src('mobile/src/navigation/types.ts');
        const mobileDashboard = src('mobile/src/screens/owner/OwnerScreens.tsx');

        it('RANGE_LABELS are byte-identical to the web AnalyticsTab', () => {
                // Web: single-quoted literals; mobile: double-quoted — the
                // LABEL strings themselves must match byte-for-byte.
                for (const [value, label] of [
                        ['today', 'اليوم'],
                        ['week', 'هذا الأسبوع'],
                        ['month', 'هذا الشهر'],
                ] as const) {
                        expect(webCharts).toContain(`value: '${value}', label: '${label}'`);
                        expect(mobileScreen).toContain(`value: "${value}", label: "${label}"`);
                }
        });

        it('the lock surface carries the web PlanFeatureLock family copy verbatim', () => {
                // The web title/description/CTA construction (PlanFeatureLock.tsx:31-32,72).
                expect(webLock).toContain("${def.labelAr} متوفرة في خطة «${def.minPlanNameAr}» فأعلى");
                expect(webLock).toContain('قم بترقية خطتك لفتح هذه الميزة والاستفادة من كامل قدرات منصتك.');
                expect(webLock).toContain('الترقية إلى خطة {def.minPlanNameAr}');
                expect(mobileLockCard).toContain('متوفرة في خطة «${PLAN_FEATURE_ADVANCED_STATS.minPlanNameAr}» فأعلى');
                expect(mobileLockCard).toContain('قم بترقية خطتك لفتح هذه الميزة والاستفادة من كامل قدرات منصتك.');
                expect(mobileLockCard).toContain('`الترقية إلى خطة ${PLAN_FEATURE_ADVANCED_STATS.minPlanNameAr}`');
        });

        it('the error copy + per-card empty copy mirror the web AnalyticsTab verbatim', () => {
                expect(webCharts).toContain("setError('تعذّر تحميل التحليلات')");
                expect(mobileScreen).toContain('ANALYTICS_ERROR_COPY = "تعذّر تحميل التحليلات"');
                for (const emptyCopy of [
                        'لا توجد زيارات مسجلة بعد',
                        'لا توجد أصناف مطلوبة بعد',
                        'لا يوجد توزيع تصنيفات بعد',
                        'لا يوجد نشاط يومي بعد',
                        'لا توجد بيانات إيرادات بعد',
                ]) {
                        expect(webCharts).toContain(emptyCopy);
                        expect(mobileScreen).toContain(emptyCopy);
                }
        });

        it('the dual gate mirrors the web: the entitlements probe + the 403 primary truth', () => {
                // Web: the probe (page.tsx) + the 403 → lock (OwnerCharts).
                expect(webPage).toContain('/api/owner/entitlements?restaurantId=');
                expect(webPage).toContain('features?.advancedStats');
                expect(webCharts).toContain('res.status === 403');
                // Mobile: both halves on the screen.
                expect(mobileScreen).toContain('`/api/owner/entitlements?restaurantId=${restaurantId}`');
                expect(mobileScreen).toContain('advancedStats === false ? "denied" : "allowed"');
                expect(mobileScreen).toContain('status === 403');
                expect(mobileScreen).toContain('setLocked(classifyPlanFeatureGate(e))');
        });

        it('the upgrade door carries the restaurant context into OwnerSubscribe (the 5e74620f doctrine)', () => {
                expect(mobileScreen).toContain(
                        'navigation.navigate("OwnerSubscribe", restaurantId !== null ? { restaurantId } : undefined)'
                );
        });

        it('the screen is wired: OwnerStack registration + nav types + the dashboard mount', () => {
                expect(mobileStack).toContain('name="OwnerAnalytics"');
                expect(mobileStack).toContain('title: "التحليلات"');
                expect(mobileNavTypes).toContain('OwnerAnalytics: { restaurantId?: number } | undefined;');
                // The dashboard section card — the always-visible web tab twin.
                expect(mobileDashboard).toContain('navigation.navigate("OwnerAnalytics")');
        });

        it('the chart SHAPES port to react-native-svg (zero new dependencies — it was already present)', () => {
                const pkg = JSON.parse(src('mobile/package.json'));
                expect(pkg.dependencies['react-native-svg']).toBe('15.16.0');
                expect(pkg.devDependencies['react-native-svg']).toBeUndefined();
                for (const chart of ['AreaChart', 'SplineAreaChart', 'ColumnChart', 'DoughnutChart']) {
                        expect(src(`mobile/src/components/charts/${chart}.tsx`)).toContain('from "react-native-svg"');
                }
                // The geometry port rides the SAME math as the web file.
                const webGeometry = src('src/lib/chart-geometry.ts');
                const mobileGeometry = src('mobile/src/components/charts/chart-geometry.ts');
                expect(webGeometry).toContain('export function catmullRomPath');
                expect(mobileGeometry).toContain('export function catmullRomPath');
                expect(mobileGeometry).toContain('export function donutSlicePath');
                expect(mobileGeometry).toContain('export function tickIndices');
        });

        it('the screen consumes the SAME endpoints as the web — no new API surface', () => {
                // Exactly the two routes the web twin rides; anything else the
                // screen fetches would be an invented data source.
                const fetches = mobileScreen.match(/api\.[a-zA-Z]+<[^>]*>\(\s*`([^`]+)`/g) ?? [];
                expect(fetches).toHaveLength(2);
                expect(fetches.some((f) => f.includes('/api/owner/entitlements?restaurantId='))).toBe(true);
                expect(fetches.some((f) => f.includes('/api/stats/advanced?restaurantId=') && f.includes('range='))).toBe(true);
        });
});

// ── 5. what could NOT be pinned (honest boundaries) ──────────────────────────
// Actual React Native rendering (the SVG charts drawing, the press-grow
// doughnut, the skeleton sweep), navigation pushes, and the live HTTP
// round-trip — mobile has no Jest/RTL/RNTL setup (a fleet decision, not
// this task's). Those are covered by tsc + eslint + the raw-text parity
// snapshot (mobile/tests/design/parity.mjs §GAP-MENU-1, 20 pins) + the CI
// Metro/Hermes export, and remain human-QA territory on the Wave-9
// rebuild this rides.
