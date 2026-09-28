import type { Metadata } from "next";

export const metadata: Metadata = {
        // r121-L-4: brand suffix stripped — the root template already appends
        // «| المنيو الذكي» (was «سلة الطلبات | Smart Menu | المنيو الذكي»).
        title: "سلة الطلبات",
        description: "راجع طلباتك وأرسلها عبر واتساب للمطعم.",
        robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
        // r121-K-3: skip-link target (see login/layout.tsx note).
        return <div id="main-content" tabIndex={-1} className="focus:outline-none">{children}</div>;
}
