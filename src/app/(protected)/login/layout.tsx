import type { Metadata } from "next";

export const metadata: Metadata = {
        description: "سجّل دخولك للوحة تحكم مطعمك.",
        robots: { index: false, follow: false },
        // r121-L-4: the dead `title` is deleted — login/page.tsx always overrode
        // it (two files, two brands, one loser). The page title is now the single
        // source and renders through the root template as
        // «تسجيل الدخول | المنيو الذكي» (no hardcoded brand suffix).
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
        // r121-K-3: skip-link target — the group main's first tabbable children
        // were the page content, but the old id lived ABOVE the page tree; each
        // (protected) sub-layout now owns the target on its content root.
        return <div id="main-content" tabIndex={-1} className="focus:outline-none">{children}</div>;
}
