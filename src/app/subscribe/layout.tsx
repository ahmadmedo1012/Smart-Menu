import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "اشترك الآن | Smart Menu",
	description: "أنشئ منيو مطعمك الرقمي في دقائق — تسجيل مجاني، ترقية فورية.",
	robots: { index: false, follow: true },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
	return children;
}
