/**
 * P42-5b (GAP-X1) — the native plan-lock surface, pinned from the web source.
 *
 * WHAT GAP-X1 WAS (Wave-3 parity audit, file:line evidence): plan-limit
 * server refusals surfaced on the NATIVE owner screens as bare server-copy
 * toasts with no upgrade door — mobile/src/screens/owner/
 * OwnerRestaurantsScreen.tsx (addMenu catch) + OwnerMenuScreen.tsx (ItemSheet
 * save catch) — while the web surfaces the same states honestly (the unified
 * Arabic 403 copy src/lib/plan-limit-error.ts:31-46, the feature-lock family
 * src/components/shared/PlanFeatureLock.tsx:20 «تعطيل + تفسير + رابط ترقية»,
 * the analytics 403 lock OwnerCharts.tsx:97, and the at-cap usage badge with
 * its «ترقية» door PlanUsageBadge.tsx:108-114).
 *
 * WHAT THIS FILE PINS
 * ───────────────────
 * 1. THE CLASSIFIER (real imports, not mocks): mobile/src/lib/plan-limit.ts
 *    is pure zero-import TypeScript on purpose, so the root vitest suite —
 *    mobile ships no unit-test runner (mobile/tests/design/parity.mjs
 *    header; the mobile gates are tsc + eslint + the raw-text parity
 *    snapshot + the CI Metro export) — imports BOTH sides of the family:
 *    the classifier AND the web's own PlanLimitError class. A message is
 *    built by the WEB class and classified by the MOBILE classifier: if
 *    either side drifts, this fails. That is the "port faithfully" contract.
 * 2. THE RENDER SURFACES (raw-text contracts — the tests/design/parity.test.ts
 *    + r145 precedent for mobile/web surfaces no runner can mount): the lock
 *    sheet's verbatim web copy + CTA, the two mount points' toast fallbacks
 *    (byte-identical for non-plan errors — the hard constraint), and the
 *    upgrade flow's endpoint/context/wallet-honesty wiring.
 *
 * WHAT COULD NOT BE PINNED (honest, and why): actual React Native rendering,
 * the BottomSheetModal "switch" handoff (the lock presenting over the item
 * form), navigation pushes and the live HTTP round-trip — mobile has no
 * Jest/RTL/RNTL setup (installing one is a fleet decision, not this task's),
 * so those behaviors are covered by tsc + eslint + the CI Metro/Hermes export
 * (which catches broken imports/resolution) and remain human-QA territory on
 * the Wave-8 rebuild this rides.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PlanLimitError } from '@/lib/plan-limit-error';
// The mobile classifier — pure TS (zero imports) so the root suite can load
// it across the tree boundary. Mobile's ApiError ({status, message, …} —
// mobile/src/types/index.ts:33) satisfies the structural input shape; the
// tests feed plain objects of that shape plus the web class's own output.
import {
        classifyPlanLimit,
        PLAN_LIMIT_KIND_LABELS,
        type PlanLimitKind,
} from '../../mobile/src/lib/plan-limit';

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

// ── 1. the classifier — web class output → native classification ────────────

describe('P42-5b classifier — the web PlanLimitError family, parsed off the wire', () => {
        it('classifies the WEB class\'s own output for every kind (the port-faithful pin)', () => {
                // Built by the web class exactly as the API routes throw it
                // (owner/restaurants:138 kind menus · items:299 kind items ·
                // orders: PlanLimitError kind orders), classified as the
                // mobile client sees it: a 403 + the message string.
                for (const kind of ['orders', 'items', 'menus'] as PlanLimitKind[]) {
                        const serverErr = new PlanLimitError({ kind, limit: 10, planName: null });
                        const out = classifyPlanLimit({ status: 403, message: serverErr.message });
                        expect(out, `kind ${kind}: message «${serverErr.message}»`).not.toBeNull();
                        expect(out?.kind).toBe(kind);
                        expect(out?.limit).toBe(10);
                        expect(out?.planName).toBeNull();
                        expect(out?.message).toBe(serverErr.message);
                }
        });

        it('parses the plan display name («خطة …») and the generic «خطتك» form', () => {
                const named = new PlanLimitError({ kind: 'menus', limit: 1, planName: 'أساسي' });
                const out = classifyPlanLimit({ status: 403, message: named.message });
                expect(out?.kind).toBe('menus');
                expect(out?.limit).toBe(1);
                expect(out?.planName).toBe('أساسي');

                const generic = new PlanLimitError({ kind: 'items', limit: 50, planName: null });
                expect(classifyPlanLimit({ status: 403, message: generic.message })?.planName).toBeNull();
        });

        it('the kind labels mirror the web KIND_LABELS verbatim (ال prefix included)', () => {
                const web = src('src/lib/plan-limit-error.ts');
                for (const label of Object.values(PLAN_LIMIT_KIND_LABELS)) {
                        // the web module must carry the same literal the mobile
                        // classifier matches on — copy drift fails here.
                        expect(web).toContain(`: '${label}',`);
                }
        });

        it('a plan-name message classified from a plain object (the ApiError shape)', () => {
                // The mobile client throws ApiError(message, status) — a plain
                // structural {status, message} is what the classifier reads.
                const msg = 'لقد وصلت للحد الأقصى للأصناف (10) في خطة «مجاني». قم بترقية خطتك لإضافة المزيد.';
                const out = classifyPlanLimit({ name: 'ApiError', status: 403, message: msg, details: undefined });
                expect(out?.kind).toBe('items');
                expect(out?.limit).toBe(10);
                expect(out?.planName).toBe('مجاني');
                expect(out?.message).toBe(msg);
        });
});

describe('P42-5b classifier — the 403s that must STAY toasts (negative pins)', () => {
        it('the expired-subscription renewal gate is NOT a plan cap (different remedy)', () => {
                // owner/restaurants:30 + items:222 — the renewal 403. It must
                // keep its existing handling: the lock panel promises an
                // UPGRADE door, which is the wrong remedy for a renewal.
                const renewal = { status: 403, message: 'اشتراكك منتهي. جدّد اشتراكك للمتابعة.' };
                expect(classifyPlanLimit(renewal)).toBeNull();
        });

        it('authorization refusals are not plan caps', () => {
                expect(classifyPlanLimit({ status: 403, message: 'غير مصرح' })).toBeNull();
                expect(classifyPlanLimit({ status: 403, message: 'لا تملك صلاحية ترقية هذا المطعم' })).toBeNull();
        });

        it('non-403 statuses never lock (409 slug held / 422 validation / 400 / 500)', () => {
                for (const status of [400, 409, 422, 429, 500]) {
                        const e = {
                                status,
                                message: new PlanLimitError({ kind: 'items', limit: 10, planName: null }).message,
                        };
                        expect(classifyPlanLimit(e), `status ${status}`).toBeNull();
                }
        });

        it('non-ApiError throwables never lock (strings, Errors, nulls, malformed)', () => {
                expect(classifyPlanLimit('لقد وصلت للحد الأقصى')).toBeNull();
                expect(classifyPlanLimit(new Error('لقد وصلت للحد الأقصى للأصناف'))).toBeNull(); // no status
                expect(classifyPlanLimit(null)).toBeNull();
                expect(classifyPlanLimit(undefined)).toBeNull();
                expect(classifyPlanLimit({ status: 403 })).toBeNull(); // no message
                expect(classifyPlanLimit({ status: '403', message: 'لقد وصلت للحد الأقصى للأصناف (1) في خطتك. قم بترقية خطتك لإضافة المزيد.' })).toBeNull(); // string status
        });

        it('a 403 carrying only ONE of the two copy markers does not lock', () => {
                // marker prefix without the remedy clause — not the family's shape
                expect(classifyPlanLimit({ status: 403, message: 'لقد وصلت للحد الأقصى للأصناف في خطتك.' })).toBeNull();
                // the remedy clause alone (other error families say «قم بترقية خطتك» too)
                expect(classifyPlanLimit({ status: 403, message: 'هذه الميزة متوفرة في خطة «الاحترافية» فأعلى. قم بالترقية للمتابعة.' })).toBeNull();
        });
});

// ── 2. the render surfaces — raw-text contracts (no RN runner on mobile) ────

const lockSheet = src('mobile/src/components/shared/PlanLimitLockSheet.tsx');
const ownerMenu = src('mobile/src/screens/owner/OwnerMenuScreen.tsx');
const ownerRestaurants = src('mobile/src/screens/owner/OwnerRestaurantsScreen.tsx');
const ownerSubscribe = src('mobile/src/screens/owner/OwnerSubscribeScreen.tsx');
const ownerStack = src('mobile/src/navigation/OwnerStack.tsx');
const navTypes = src('mobile/src/navigation/types.ts');

describe('P42-5b lock sheet — the honest panel + the upgrade door', () => {
        it('carries the task-family CTA «رقِّ خطتك» and rides the app sheet (AppBottomSheet)', () => {
                expect(lockSheet).toContain('PLAN_LIMIT_LOCK_CTA = "رقِّ خطتك"');
                expect(lockSheet).toContain('AppBottomSheet');
        });

        it('the upgrade promise mirrors the WEB copy verbatim (PaymentSection.tsx:46)', () => {
                const webPaymentSection = src('src/app/(protected)/subscribe/PaymentSection.tsx');
                const promise = 'بيانات مطعمك الحالية ستبقى كما هي — فقط سيتم ترقية خطتك.';
                // the web source carries it…
                expect(webPaymentSection).toContain(promise);
                // …and the native lock sheet renders the SAME bytes.
                expect(lockSheet).toContain(promise);
        });

        it('the heading mirrors the web at-cap badge line (PlanUsageBadge.tsx:131)', () => {
                const webBadge = src('src/components/owner/PlanUsageBadge.tsx');
                expect(webBadge).toContain('وصلت للحد الأقصى. قم بترقية خطتك.');
                expect(lockSheet).toContain('PLAN_LIMIT_LOCK_TITLE = "وصلت للحد الأقصى"');
        });

        it('renders the SERVER message verbatim (no paraphrase) and announces it to screen readers', () => {
                expect(lockSheet).toContain('{details.message}');
                // the toast twin's SR announcement (app/providers.tsx:163)
                expect(lockSheet).toContain('announceForAccessibility');
        });
});

describe('P42-5b mount points — the lock replaces the toast ONLY for plan caps', () => {
        it('OwnerMenuScreen: the ItemSheet catch classifies first, keeps the byte-identical toast fallback', () => {
                expect(ownerMenu).toContain('classifyPlanLimit(e)');
                expect(ownerMenu).toContain('onPlanLimit(cap)');
                // the fallback line for everything else — byte-identical to the
                // pre-P42-5b catch (the hard constraint)
                expect(ownerMenu).toContain(
                        'toast.error(getErrorMessage(e, editing ? "تعذّر تحديث الصنف" : "تعذّر إضافة الصنف"));'
                );
        });

        it('OwnerMenuScreen: the lock CTA routes into the upgrade flow carrying the capped restaurant', () => {
                expect(ownerMenu).toContain('PlanLimitLockSheet');
                expect(ownerMenu).toContain(
                        'navigation.navigate("OwnerSubscribe", activeRestaurant ? { restaurantId: activeRestaurant.id } : undefined);'
                );
        });

        it('OwnerRestaurantsScreen: the addMenu catch classifies first, keeps the byte-identical toast fallback', () => {
                expect(ownerRestaurants).toContain('classifyPlanLimit(e)');
                expect(ownerRestaurants).toContain('setPlanLock(cap)');
                // the fallback line for 409/422/network — byte-identical
                expect(ownerRestaurants).toContain('toast.error(getErrorMessage(e, "تعذّر إضافة المنيو"));');
        });

        it('OwnerRestaurantsScreen: the menus-cap CTA passes NO restaurant context (the web CTA behavior)', () => {
                // the menus cap is account-level — the web /subscribe CTA is a
                // plain Link with no context; the destination self-resolves the
                // primary link from the auth row.
                expect(ownerRestaurants).toContain('navigation.navigate("OwnerSubscribe");');
        });
});

describe('P42-5b upgrade flow — the web /subscribe upgrade-mode twin', () => {
        it('posts the web upgrade contract: /api/subscriptions/upgrade with planId + upgradeRestaurantId', () => {
                expect(ownerSubscribe).toContain('"/api/subscriptions/upgrade"');
                expect(ownerSubscribe).toContain('upgradeRestaurantId: targetRestaurantId');
        });

        it('resolves the target the WEB way: route context falls back to the auth row\'s primary link', () => {
                expect(ownerSubscribe).toContain('routeParams.restaurantId ?? user?.restaurantId ?? null');
        });

        it('the plan picker mirrors the web upgrade mode: paid plans only + the verbatim heading', () => {
                const webPlanSelector = src('src/app/(protected)/subscribe/PlanSelector.tsx');
                expect(webPlanSelector).toContain("upgradeMode ? 'اختر خطة للترقية إليها'");
                expect(ownerSubscribe).toContain('اختر خطة للترقية إليها');
                // web PlanSelector.tsx:30 — upgrade mode filters the free plan out
                expect(webPlanSelector).toContain('Number(p.price) > 0');
                expect(ownerSubscribe).toContain('Number(p.price) > 0');
        });

        it('wallets only + the server\'s own >99 cap copy + the honest web pointer (no fake bank flow)', () => {
                expect(ownerSubscribe).toContain('(["libyana", "madar"] as const)');
                // the server's cap copy, verbatim (upgrade/route.ts:65)
                const upgradeRoute = src('src/app/api/subscriptions/upgrade/route.ts');
                const capNote = 'المبالغ فوق 99 د.ل تتطلب تحويل بنكي';
                expect(upgradeRoute).toContain(capNote);
                expect(ownerSubscribe).toContain(capNote);
                expect(ownerSubscribe).toContain('BANK_ON_WEB_NOTE');
                expect(ownerSubscribe).toContain('needsBank');
        });

        it('the upgrade promise + the «ادفع الآن» CTA ride the web summary twins', () => {
                expect(ownerSubscribe).toContain('UPGRADE_PROMISE');
                expect(ownerSubscribe).toContain('ادفع الآن (');
        });

        it('the upgrade route is registered on the owner stack (a real in-app destination)', () => {
                expect(ownerStack).toContain('name="OwnerSubscribe"');
                expect(navTypes).toContain('OwnerSubscribe: { restaurantId?: number } | undefined;');
        });
});
