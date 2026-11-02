/**
 * P42-5d (GAP-MENU-1) — native plan-FEATURE-gate classifier: the SECOND 403
 * family the owner surfaces can meet, ported for the advanced-analytics
 * screen (and any future feature-gated surface).
 *
 * SOURCE (ported faithfully — the web family lives in
 * src/lib/plan-entitlements-core.ts, enforced server-side by
 * requirePlanFeature in src/lib/plan-entitlements.ts:53-58):
 *   · The feature gates answer 403 with the ONE unified Arabic copy
 *     (planFeatureDeniedCopy, plan-entitlements-core.ts:86-90):
 *       «هذه الميزة متوفرة في خطة «${minPlanNameAr}» فأعلى. قم بالترقية للمتابعة.»
 *     For advancedStats that is exactly:
 *       «هذه الميزة متوفرة في خطة «بريميوم» فأعلى. قم بالترقية للمتابعة.»
 *   · The enforcement route (api/stats/advanced/route.ts:48-49
 *     `requirePlanFeature(auth, restaurantId, 'advancedStats')`) answers
 *     BEFORE any feature DB work — the client only sees the wire.
 *
 * WHY A SEPARATE MODULE (not an extension of plan-limit.ts): the owner-side
 * 403 carries THREE families with DIFFERENT remedies, and the existing
 * count-cap classifier (plan-limit.ts — «لقد وصلت للحد الأقصى … قم بترقية
 * خطتك لإضافة المزيد.») must keep its behavior byte-identical (5e74620f
 * pins it). The marker pair here is the feature family's own copy:
 *   · count cap    → «لقد وصلت للحد الأقصى … قم بترقية خطتك لإضافة المزيد.»
 *                    (remedy names the CAP — plan-limit.ts owns it);
 *   · feature gate → «هذه الميزة متوفرة في خطة «…» فأعلى. قم بالترقية
 *                    للمتابعة.» (remedy says CONTINUE — this module);
 *   · renewal      → «اشتراكك منتهي. جدّد اشتراكك للمتابعة.» (a different
 *                    remedy entirely — deliberately classifies NOWHERE).
 * Requiring BOTH the prefix and the «للمتابعة» remedy makes a false
 * positive on the other families effectively impossible (the count-cap
 * remedy clause is «لإضافة المزيد», not «للمتابعة»).
 *
 * This module is PURE TypeScript with ZERO imports on purpose (the
 * plan-limit.ts doctrine): the root vitest suite
 * (tests/unit/p42-5d-mobile-analytics-feature-gate.test.ts) imports it
 * directly across the tree boundary and drives it against the WEB
 * planFeatureDeniedCopy builder — copy drift on either side fails the suite.
 */

/** The feature keys the web core defines (plan-entitlements-core.ts:38). */
export type PlanFeatureKey = "advancedStats" | "csvExport" | "referralProgram";

/** The advancedStats feature definition — the web PLAN_FEATURES entry,
 *  mirrored verbatim (labelAr + minPlanNameAr feed the lock copy below). */
export const PLAN_FEATURE_ADVANCED_STATS: {
  minPlanNameAr: string;
  labelAr: string;
} = {
  minPlanNameAr: "بريميوم",
  labelAr: "الإحصائيات المتقدمة",
};

/** What the classifier lifts out of the server's feature-gate 403 copy. */
export interface PlanFeatureGateDetails {
  /** The gated feature when its min-plan name matches a known tier
   *  (advancedStats today) — null for a future feature's copy. */
  feature: PlanFeatureKey | null;
  /** The minimum plan's Arabic display name («بريميوم») — parsed from
   *  «خطة «…» فأعلى» in the server copy. */
  minPlanName: string | null;
  /** The server's verbatim message (the unified feature-denied 403 copy). */
  message: string;
}

/**
 * «هذه الميزة متوفرة في خطة …» + «قم بالترقية للمتابعة» — the two clauses
 * every planFeatureDeniedCopy message carries (plan-entitlements-core.ts:89).
 * Requiring BOTH keeps the family distinct from the count-cap remedy
 * («قم بترقية خطتك لإضافة المزيد») and the renewal gate.
 */
const PLAN_FEATURE_PREFIX = "هذه الميزة متوفرة في خطة";
const PLAN_FEATURE_REMEDY = "قم بالترقية للمتابعة";

/**
 * Classify a caught error as the plan-FEATURE-gate 403 family.
 *
 * @param e anything a catch site holds — mobile's ApiError satisfies the
 *        structural shape {status: number; message: string}.
 * @returns the parsed gate context when the response is a feature-gate 403,
 *          null otherwise (count caps, renewal gates, authorization
 *          refusals, network failures… — all keep their existing handling).
 */
export function classifyPlanFeatureGate(e: unknown): PlanFeatureGateDetails | null {
  if (typeof e !== "object" || e === null) return null;
  const { status, message } = e as { status?: unknown; message?: unknown };
  // Only the feature gate answers 403 with this copy (requirePlanFeature →
  // error(planFeatureDeniedCopy(feature), 403) — plan-entitlements.ts:57).
  if (status !== 403) return null;
  if (typeof message !== "string") return null;

  // Copy markers — the feature family's own two clauses.
  if (!message.includes(PLAN_FEATURE_PREFIX) || !message.includes(PLAN_FEATURE_REMEDY)) {
    return null;
  }

  // Min-plan name: «في خطة «بريميوم» فأعلى» — the web builder interpolates
  // minPlanNameAr between the guillemets (plan-entitlements-core.ts:89).
  const planMatch = message.match(/في خطة «([^»]+)» فأعلى/);
  const minPlanName = planMatch ? planMatch[1] : null;

  // Feature: the known tiers' min-plan names (advancedStats → بريميوم today).
  // An unknown plan name still locks (the markers matched) — feature rides
  // as null, honestly, and the lock copy falls back to the server message.
  let feature: PlanFeatureKey | null = null;
  if (minPlanName === PLAN_FEATURE_ADVANCED_STATS.minPlanNameAr) {
    feature = "advancedStats";
  }

  return { feature, minPlanName, message };
}
