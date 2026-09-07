import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "الباقات والأسعار | Smart Menu",
	description:
		"باقات مرنة للمطاعم والمقاهي — ابدأ مجاناً، ورقّ لاحقاً. منيو رقمي + طلبات واتساب + ولاء.",
	// round93 (W2-b / تقرير 1-a §3): canonical بنفس نمط menu/[slug] —
	// مسار نسبي يُحلّ ضد metadataBase المعرف في التخطيط الجذر.
	alternates: { canonical: "/pricing" },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
	return children;
}
