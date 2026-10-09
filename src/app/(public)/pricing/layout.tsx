import type { Metadata } from "next";

export const metadata: Metadata = {
        // r121-L-4: brand suffix stripped — the root template already appends
        // the suffix (r127-F3 unified it to «| الربط الذكي»; the pre-r121 title
        // was the triple «الباقات والأسعار | Smart Menu | المنيو الذكي»).
        title: "الباقات والأسعار",
        description:
                "باقات مرنة للمطاعم والمقاهي — ابدأ مجاناً، ورقّ لاحقاً. منيو رقمي + طلبات واتساب + ولاء.",
        // round93 (W2-b / تقرير 1-a §3): canonical بنفس نمط menu/[slug] —
        // مسار نسبي يُحلّ ضد metadataBase المعرف في التخطيط الجذر.
        alternates: { canonical: "/pricing" },
        // r110-F6: og:url كانت ترث "/" من الجذر (النطاق بلا مسار) بينما
        // canonical الصفحة /pricing — محركات التقاسم تقرأ og:url. openGraph
        // يُستبدل كاملاً (دمج ضحل) لذا تُكرر حقول الجذر مع تغيير url فقط.
        openGraph: {
                // r121-L-4: og:title suffix unified to the og:site_name token
                // «الربط الذكي» (terms/privacy already use it — pricing was the
                // odd one out with the Latin brand).
                title: "الباقات والأسعار | الربط الذكي",
                description:
                        "باقات مرنة للمطاعم والمقاهي — ابدأ مجاناً، ورقّ لاحقاً. منيو رقمي + طلبات واتساب + ولاء.",
                url: "/pricing",
                siteName: "الربط الذكي",
                images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "الربط الذكي — منيو رقمي ذكي للمطاعم والمقاهي" }],
                locale: 'ar_AR',
                type: "website",
        },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
        return children;
}
