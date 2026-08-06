import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "تسجيل الدخول | Smart Menu",
	description: "سجّل دخولك للوحة تحكم مطعمك.",
	robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
	return children;
}
