import type { Metadata } from "next";
import { ErrorShellLangFix } from "@/components/shared/ErrorShellLangFix";

/**
 * r111-F12 (layer 3 of 3): root 404 — SELF-CONTAINED, ZERO-CSS fallback.
 *
 * This boundary renders OUTSIDE both route-group root layouts (the app has no
 * root layout.tsx), so NOTHING guarantees globals.css, fonts, ThemeProvider or
 * even dir/lang on the html Next.js synthesizes for it. Until r111 it used
 * Tailwind classes that were never loaded → bare white LTR page with Arabic
 * text stacked top-left (live-proven on every typo URL).
 *
 * Layer 1 ((public)/[...notfound] catch-all) now routes unmatched URLs through
 * the themed path, but Next.js still reaches THIS file for a few shell-level
 * paths — so it is rewritten with INLINE STYLES ONLY: no Tailwind, no CSS
 * import, no CSS-dependent components (no Button/ThemeToggle), system fonts.
 * It literally cannot lose its styling. Dark palette mirrors the brand
 * (#010000 bg / #ebe7e2 text / #bc4700 accent — from globals.css tokens).
 */

export const metadata: Metadata = {
        title: "404 - الصفحة غير موجودة",
        description: "الرابط الذي تبحث عنه غير صحيح أو تم نقله.",
        robots: { index: false, follow: false },
};

const LINKS = [
        { href: "/", label: "الرئيسية" },
        { href: "/pricing", label: "الخطط والأسعار" },
        { href: "/login", label: "لوحة التحكم" },
        { href: "/menu/al-waha-cafe-demo", label: "منيو تجريبي" },
];

const SYS_FONT =
        'system-ui, -apple-system, "Segoe UI", Tahoma, "Noto Sans Arabic", "Arabic Typesetting", Arial, sans-serif';

export default function NotFound() {
        return (
                <>
                        {/* r119-S5-P1-3: Next 16 renders the global 404 inside its hardcoded
                                <html id="__next_error__"> shell — the root layout's <html> attributes
                                are ignored on this path (verified on 16.3.4: prerendered _not-found.html
                                is correct, but the served response uses the error shell). A client
                                component is the only code that runs on this path: it restores
                                lang/dir (WCAG 3.1.1) and the honest 404 title at hydration — the same
                                tick the content itself becomes visible (the shell body is empty until
                                hydration, so nothing Arabic is ever announced before this runs). */}
                        <ErrorShellLangFix />
                        {/* Brand fonts for the 404 — the error shell doesn't apply the group
                                layouts' fonts.css link; a hydrated <link> still loads (unlike scripts). */}
                        {/* eslint-disable-next-line @next/next/no-css-tags — deliberate: the
                                __next_error__ shell bypasses every group layout, this is the only
                                way this boundary gets the brand fonts (same escape hatch the
                                group layouts use for fonts.css). */}
                        <link rel="stylesheet" href="/fonts/fonts.css" />
                        <main
                        dir="rtl"
                        lang="ar"
                        style={{
                                minHeight: "100dvh",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                background:
                                        "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(188,71,0,0.10), transparent 70%), #010000",
                                color: "#ebe7e2",
                                fontFamily: SYS_FONT,
                                padding: "2rem 1.25rem",
                                textAlign: "center",
                                boxSizing: "border-box",
                        }}
                >
                        {/* React 19 hoists this even inside the Next error shell */}
                        <meta name="robots" content="noindex" />

                        <div
                                style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.625rem",
                                        marginBottom: "2.5rem",
                                }}
                        >
                                <span
                                        style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 12,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: "rgba(188,71,0,0.12)",
                                                color: "#e8630a",
                                                fontWeight: 700,
                                                fontSize: "1.1rem",
                                        }}
                                        aria-hidden="true"
                                >
                                        ✦
                                </span>
                                <span style={{ fontSize: "1.15rem", fontWeight: 700 }}>الربط الذكي</span>
                        </div>

                        <div
                                style={{
                                        fontSize: "clamp(4.5rem, 18vw, 7.5rem)",
                                        fontWeight: 800,
                                        lineHeight: 1,
                                        color: "#e8630a",
                                        marginBottom: "0.75rem",
                                        userSelect: "none",
                                }}
                                aria-hidden="true"
                        >
                                404
                        </div>

                        <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: "0 0 0.75rem" }}>
                                الصفحة غير موجودة
                        </h1>
                        <p
                                style={{
                                        fontSize: "1.05rem",
                                        color: "#8c857d",
                                        maxWidth: "26rem",
                                        lineHeight: 1.8,
                                        margin: "0 0 2rem",
                                }}
                        >
                                الرابط الذي تبحث عنه غير صحيح أو تم نقله. جرّب أحد الروابط التالية:
                        </p>

                        <nav
                                aria-label="اقتراحات التنقل"
                                style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.625rem", marginBottom: "2rem" }}
                        >
                                {LINKS.map((l) => (
                                        <a
                                                key={l.href}
                                                href={l.href}
                                                style={{
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        height: 40,
                                                        padding: "0 1rem",
                                                        borderRadius: 10,
                                                        border: "1px solid #211c18",
                                                        background: "#070503",
                                                        color: "#ebe7e2",
                                                        textDecoration: "none",
                                                        fontSize: "0.925rem",
                                                }}
                                        >
                                                {l.label}
                                        </a>
                                ))}
                        </nav>

                        <a
                                href="/"
                                style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        height: 48,
                                        padding: "0 2rem",
                                        borderRadius: 12,
                                        background: "#e8630a",
                                        color: "#ffffff",
                                        textDecoration: "none",
                                        fontSize: "1rem",
                                        fontWeight: 600,
                                }}
                        >
                                العودة إلى الرئيسية
                        </a>

                        <p style={{ marginTop: "3rem", fontSize: "0.75rem", color: "rgba(140,133,125,0.5)", userSelect: "none" }}>
                                الربط الذكي — Smart Menu
                        </p>
                        </main>
                </>
        );
}
