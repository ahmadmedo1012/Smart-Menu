/**
 * P42-5d (GAP-MENU-1) — the advanced-analytics client contract, ported from
 * the web truth. The server route (src/app/api/stats/advanced/route.ts)
 * fills, aggregates and gates; the client only needs to parse the range,
 * label the axes and guard the empty states — this module is that client
 * half, ported verbatim from web src/lib/chart-stats.ts (the helpers the
 * web AnalyticsTab consumes) + the OwnerCharts.tsx local types/phrase.
 *
 * SERVER-FILLED SERIES (do not recompute on the client — no invented
 * metrics): revenue7d/orders7d/hourlyDistribution/aovTrend arrive
 * zero-filled per bucket by fillHours/fillDailySeries/fillRevenueSeries;
 * categoryBreakdown arrives share-capped (max 5 slices) with pct computed.
 * The client's only judgments are seriesHasData (empty vs. fake zeros —
 * the honest-empty doctrine) and the labels.
 *
 * The two format imports are PURE zero-dependency modules (the one
 * implementation web and mobile share, per arabic-plural.ts's own header),
 * so this file stays importable by the root vitest suite across the tree
 * boundary (the plan-limit.ts doctrine) — peakOrdersPhrase is driven there
 * against the same counts the web phrase serves.
 */
import { getArabicPlural } from "./arabic-plural";
import { toArabicNumber } from "./format";

/** Web chart-stats.ts:5 — the range the server route accepts. */
export type AnalyticsRange = "today" | "week" | "month";

/** Web chart-stats.ts:8-11 — verbatim (unknown value → the week default). */
export function parseAnalyticsRange(raw: string | null | undefined): AnalyticsRange {
  if (raw === "today" || raw === "week" || raw === "month") return raw;
  return "week";
}

/** Web chart-stats.ts:127 — «أحد 5» style axis labels (weekday + day number). */
const WEEKDAYS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export function dayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey.slice(5);
  return `${WEEKDAYS_AR[d.getDay()]} ${d.getDate()}`;
}

/** Web chart-stats.ts:132-135 — «14:00» hour labels (24h, zero-padded). */
export function hourLabel(hour: number): string {
  const h = Math.max(0, Math.min(23, Number(hour) || 0));
  return `${String(h).padStart(2, "0")}:00`;
}

/** Web chart-stats.ts:158-160 — the honest-empty guard: a zero-filled
 *  series is EMPTY, not "zero revenue" (no fake zeros on the charts). */
export function seriesHasData(values: number[]): boolean {
  return values.some((v) => v > 0);
}

/** The AdvancedStats payload — web OwnerCharts.tsx:42-62 interface twin
 *  (the fields the AnalyticsTab consumes; revenueRange/ordersRange ride the
 *  wire too but no surface reads them — same omission as the web type). */
export interface CategoryShare {
  categoryId: number;
  name: string;
  count: number;
  pct: number;
}

export interface AdvancedStats {
  range?: AnalyticsRange;
  revenue7d: { date: string; revenue: number }[];
  orders7d: { date: string; count: number }[];
  topItems: { itemId: number; name: string; totalSold: number; growth: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  aovTrend: { date: string; aov: number }[];
  growthPct: number;
  categoryBreakdown?: CategoryShare[];
  dailyActivity?: {
    current: { date: string; count: number }[];
    previous: { date: string; count: number }[];
  };
}

/**
 * The peak-orders phrase — web OwnerCharts.tsx:32-40 twin, verbatim: dynamic
 * Arabic plural for the peak-hour count («طلب واحد / طلبان / 5 طلبات /
 * 12 طلبًا»), western digits via toArabicNumber for 3+.
 */
export function peakOrdersPhrase(count: number): string {
  const noun = getArabicPlural(count, "طلب", {
    one: "طلب واحد",
    two: "طلبان",
    few: "طلبات",
    many: "طلبًا",
  });
  return count < 3 ? noun : `${toArabicNumber(count)} ${noun}`;
}

/** The entitlements probe payload — /api/owner/entitlements (web route)
 *  answers { plan, features: Record<PlanFeatureKey, boolean> }. The flags
 *  are a PREFERENCE (avoid a wasted 403 fetch), never an enforcement — the
 *  403 from the gated route stays the primary truth. */
export interface OwnerEntitlements {
  plan: { name: string | null; nameAr: string | null; sortOrder: number | null } | null;
  features: Partial<Record<"advancedStats" | "csvExport" | "referralProgram", boolean>>;
}
