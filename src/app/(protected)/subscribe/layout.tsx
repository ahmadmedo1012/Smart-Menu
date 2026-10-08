import type { Metadata } from "next";

export const metadata: Metadata = {
        // r121-L-4: brand suffix stripped — the root template already appends
        // the suffix (r127-F3 unified it to «| الربط الذكي»; the pre-r121 title
        // was the triple «اشترك الآن | Smart Menu | المنيو الذكي»).
        title: "اشترك الآن",
        description: "أنشئ منيو مطعمك الرقمي في دقائق — تسجيل مجاني، ترقية فورية.",
        robots: { index: false, follow: true },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
        // r121-K-3: skip-link target (see login/layout.tsx note).
        return <div id="main-content" tabIndex={-1} className="focus:outline-none">{children}</div>;
}
