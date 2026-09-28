import { UserPlus, UtensilsCrossed, Share2, type LucideIcon } from "lucide-react";

// round92-D2 (1-d knip: 60 unused exports; these were dead): the exported
// BENEFITS / PARTNERS / PRICING_PLANS / SHOWCASES / TESTIMONIALS consts and
// the Benefit/Partner/Stat/PricingPlan/Showcase/Testimonial types had ZERO
// importers — every section renders its own local data. Only STEPS
// (imported by HowItWorksSection) and the live fetchPublicStats/PublicStats
// pair (used by HomePage + (public)/page.tsx) survived. Reference counts
// verified by repo-wide grep before deletion: BENEFITS 0 · PARTNERS 0
// · PRICING_PLANS 0 · SHOWCASES 0 · TESTIMONIALS 0 · STEPS 2 (definition
// + 1 importer). (r121-P3: ClientsSection — which kept the last local
// PARTNERS/TESTIMONIALS copies — was deleted entirely; fabricated
// testimonials/partners, honesty policy r82.)
type Step = { title: string; desc: string; icon: LucideIcon };

export type PublicStats = {
  totalRestaurants: number;
  totalUsers: number;
};

export async function fetchPublicStats(): Promise<PublicStats> {
  try {
    // Absolute URL so the fetch works in every context (dev, prod, SSR edge).
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const res = await fetch(`${base}/api/public/stats`);
    if (!res.ok) throw new Error(`Stats unavailable (${res.status})`);
    const ct = res.headers.get("content-type") ?? "";
    // Dev-mode cold compile can answer HTML for the first hit; retry once.
    if (!ct.includes("application/json")) {
      const retry = await fetch(`${base}/api/public/stats`, { cache: "no-store" });
      if (!retry.ok || !(retry.headers.get("content-type") ?? "").includes("application/json")) {
        throw new Error("Stats unavailable (HTML response)");
      }
      const data2: unknown = await retry.json();
      const payload2 = (data2 as { data?: PublicStats })?.data;
      if (
        !payload2 ||
        typeof payload2.totalRestaurants !== "number" ||
        typeof payload2.totalUsers !== "number"
      ) {
        throw new Error("Bad stats payload");
      }
      return payload2;
    }
    const data: unknown = await res.json();
    // round85-C6: /api/public/stats now uses the shared { success, data } envelope
    const payload = (data as { data?: PublicStats })?.data;
    if (
      !payload ||
      typeof payload.totalRestaurants !== "number" ||
      typeof payload.totalUsers !== "number"
    ) {
      throw new Error("Bad stats payload");
    }
    return payload;
  } catch {
    // Keep the section in its loading state rather than fabricating numbers.
    return { totalRestaurants: 0, totalUsers: 0 };
  }
}

export const STEPS: Step[] = [
  { title: "أنشئ حسابك", desc: "أدخل بيانات مطعمك وأنشئ حساباً مجاناً بدون بطاقة ائتمان", icon: UserPlus },
  { title: "صمم المنيو الخاص بك", desc: "أضف الأصناف والفئات والأسعار والصور بسهولة عبر لوحة التحكم", icon: UtensilsCrossed },
  { title: "استقبل طلباتك", desc: "شارك رابط المنيو مع زبائنك واستقبل الطلبات مباشرة على واتساب", icon: Share2 },
];
