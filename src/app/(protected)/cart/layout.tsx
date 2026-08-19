import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "سلة الطلبات | Smart Menu",
	description: "راجع طلباتك وأرسلها عبر واتساب للمطعم.",
	robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
	return children;
}
