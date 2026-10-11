// round92-D2 (1-d knip: 60 unused exports; these were dead): the exported
// BENEFITS / PARTNERS / PRICING_PLANS / SHOWCASES / TESTIMONIALS consts and
// the Benefit/Partner/Stat/PricingPlan/Showcase/Testimonial types had ZERO
// importers. (r121-P3: ClientsSection — which kept the last local
// PARTNERS/TESTIMONIALS copies — was deleted entirely; fabricated
// testimonials/partners, honesty policy r82.)
// r128-F1b: STEPS + the Step type retired too — the old HowItWorksSection
// (their only consumer) folded into the 5-station JourneySection; every
// station traces to shipped copy in that component now.

// ── r142 «المائدة» — REAL demo-menu data ─────────────────────────────
// The «المنيو الحي» chapter renders the platform's actual data shape
// (category → items → price) with the REAL rows the self-healing demo
// seed in src/app/demo/route.ts writes for مقهى الواحة — the live public
// demo menu every landing link opens (/menu/al-waha-cafe). Names, order
// and prices are copied VERBATIM from that seed — nothing invented (r82).
// The imagery is the r141 local culinary set (now .webp, task 2-b).
export type DemoMenuItem = { name: string; price: number };

export type DemoMenuCategory = {
  key: string;
  label: string;
  /** The emoji the demo seed stamps on the category record. */
  icon: string;
  img: string;
  alt: string;
  items: DemoMenuItem[];
};

export const DEMO_MENU: DemoMenuCategory[] = [
  {
    key: 'hot',
    label: 'مشروبات ساخنة',
    icon: '☕',
    img: '/images/culinary/cat-hot.webp',
    alt: 'قهوة عربية داكنة ببخار متصاعد في فنجان تقليدي',
    items: [
      { name: 'قهوة تركي', price: 3 },
      { name: 'إسبريسو', price: 4 },
      { name: 'كابتشينو', price: 5 },
      { name: 'شاي', price: 2 },
    ],
  },
  {
    key: 'cold',
    label: 'مشروبات باردة',
    icon: '🧃',
    img: '/images/culinary/cat-cold.webp',
    alt: 'كأس ليموناضة بالنعنع والثلج المجروش',
    items: [
      { name: 'ليموناضة', price: 4 },
      { name: 'سموثي', price: 6 },
      { name: 'موهيتو', price: 5 },
      { name: 'آيس كوفي', price: 5 },
    ],
  },
  {
    key: 'dessert',
    label: 'حلويات',
    icon: '🍰',
    img: '/images/culinary/cat-dessert.webp',
    alt: 'قطعة كنافة ذهبية مغطاة بالفستق الحلبي',
    items: [
      { name: 'تشيز كيك', price: 7 },
      { name: 'كنافة', price: 6 },
      { name: 'كريب', price: 5 },
      { name: 'بسبوسة', price: 4 },
    ],
  },
  {
    key: 'snacks',
    label: 'وجبات خفيفة',
    icon: '🍔',
    img: '/images/culinary/cat-snacks.webp',
    alt: 'مقبلات متنوعة على صينية خشبية',
    items: [
      { name: 'ساندويتش', price: 5 },
      { name: 'بطاطس مقلية', price: 3 },
      { name: 'سلطة', price: 4 },
      { name: 'برجر', price: 7 },
    ],
  },
];

/** The REAL demo menu the landing opens everywhere (live on the platform). */
export const DEMO_MENU_URL = '/menu/al-waha-cafe';

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
