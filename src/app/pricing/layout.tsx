import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "الباقات والأسعار | Smart Menu",
	description:
		"باقات مرنة للمطاعم والمقاهي — ابدأ مجاناً، ورقّ لاحقاً. منيو رقمي + طلبات واتساب + ولاء.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
	return children;
}
