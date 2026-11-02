/**
 * P42-5b (GAP-X1) — native plan-limit classifier: the owner-side 403 family
 * that must surface as the honest lock panel (upgrade door), not a bare toast.
 *
 * SOURCE (ported faithfully — the web intercepts this family at the SOURCE,
 * the native client can only see the wire):
 *   - web `src/lib/plan-limit-error.ts:31-46` — the ONE plan-cap error class
 *     (round89-E1). Every count-cap refusal answers 403 (the caller IS
 *     authorized — the plan caps them, not their session) with the unified
 *     Arabic copy:
 *       «لقد وصلت للحد الأقصى ${للطلبات|للأصناف|للمنيوهات} (${limit}) في
 *        ${خطتك|خطة «اسم»}. قم بترقية خطتك لإضافة المزيد.»
 *   - web client-side classifier precedent `src/app/(protected)/cart/
 *     submit-error.ts:40-47` — status 403 + a JSON-envelope server message is
 *     the plan-cap family there (the CUSTOMER surface, where 403 is only ever
 *     the cap). On the OWNER surface 403 carries THREE meanings, so the
 *     marker here is the PlanLimitError copy itself, not the status alone:
 *       · count cap      → «لقد وصلت للحد الأقصى … قم بترقية خطتك …» (this
 *         family — the upgrade door is the honest remedy);
 *       · expired sub    → «اشتراكك منتهي. جدّد اشتراكك للمتابعة.» (the
 *         RENEWAL gate — a different remedy, stays a toast / the auth gate);
 *       · authorization  → «غير مصرح» (stays a toast).
 *
 * This module is PURE TypeScript with ZERO imports on purpose: the root
 * vitest suite (tests/unit/mobile-plan-limit.test.ts) imports it directly —
 * mobile ships no unit-test runner (mobile/tests/design/parity.mjs header),
 * and an `@/`-aliased import would resolve against the WEB src/ under the
 * root vitest `@` alias. Mobile's `ApiError` (src/types/index.ts:33 —
 * {name, message, status, details}) satisfies the structural input shape.
 */

/** Same kinds the web class carries (plan-limit-error.ts:12). */
export type PlanLimitKind = "orders" | "items" | "menus";

/** What the classifier lifts out of the server's unified 403 copy. */
export interface PlanLimitDetails {
  /** Which plan cap was hit (null if a future kind's label isn't known). */
  kind: PlanLimitKind | null;
  /** The cap value that was reached — `(N)` in the server copy, western digits. */
  limit: number | null;
  /** Arabic plan display name («…») — null when the server said «خطتك». */
  planName: string | null;
  /** The server's verbatim message (the unified Arabic 403 copy). */
  message: string;
}

/**
 * «لقد وصلت للحد الأقصى … قم بترقية خطتك …» — the two clauses every
 * PlanLimitError message carries (constructor, plan-limit-error.ts:37-40).
 * Requiring BOTH makes a false positive on unrelated 403 copy effectively
 * impossible.
 */
const PLAN_LIMIT_PREFIX = "لقد وصلت للحد الأقصى";
const PLAN_LIMIT_REMEDY = "قم بترقية خطتك";

/** «للطلبات/للأصناف/للمنيوهات» — pre-harmonized with the ال prefix
 *  (plan-limit-error.ts:15-19, mirrored verbatim). */
export const PLAN_LIMIT_KIND_LABELS: Record<PlanLimitKind, string> = {
  orders: "للطلبات",
  items: "للأصناف",
  menus: "للمنيوهات",
};

/**
 * Classify a caught error as the plan-cap 403 family.
 *
 * @param e anything a catch site holds — mobile's ApiError satisfies the
 *        structural shape {status: number; message: string}.
 * @returns the parsed cap context when the response is a plan-limit 403,
 *          null otherwise (renewal gates, authorization refusals, network
 *          failures, validation errors… — all keep their existing handling).
 */
export function classifyPlanLimit(e: unknown): PlanLimitDetails | null {
  if (typeof e !== "object" || e === null) return null;
  const { status, message } = e as { status?: unknown; message?: unknown };
  // Only the cap refusal answers 403 with this copy (the caller IS
  // authorized — plan-limit-error.ts:8-9).
  if (status !== 403) return null;
  if (typeof message !== "string") return null;

  // Copy markers — mirror what the web intercepts at the source (the class).
  if (!message.includes(PLAN_LIMIT_PREFIX) || !message.includes(PLAN_LIMIT_REMEDY)) {
    return null;
  }

  // Kind: which «لل…» label the message carries. An unknown future kind
  // still locks (the markers matched) — kind rides as null, honestly.
  let kind: PlanLimitKind | null = null;
  for (const [k, label] of Object.entries(PLAN_LIMIT_KIND_LABELS) as [PlanLimitKind, string][]) {
    if (message.includes(label)) {
      kind = k;
      break;
    }
  }

  // Limit: «للأصناف (10)» — the constructor interpolates the number with
  // western digits (`(${info.limit})`), so \d+ is the faithful parse.
  let limit: number | null = null;
  if (kind) {
    const m = message.match(new RegExp(`${PLAN_LIMIT_KIND_LABELS[kind]} \\((\\d+)\\)`));
    if (m) limit = Number(m[1]);
  }

  // Plan name: «في خطة «أساسي»» vs the generic «في خطتك».
  const planMatch = message.match(/في خطة «([^»]+)»/);
  const planName = planMatch ? planMatch[1] : null;

  return { kind, limit, planName, message };
}
