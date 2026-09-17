import { notFound } from "next/navigation";
import type { Metadata } from "next";

/**
 * r111-F12 (layer 1 of 3): catch-all for every unmatched URL.
 *
 * Before this route existed, any typo URL (e.g. /xyz, /menu/a/b) fell through
 * to the ROOT not-found boundary — which renders OUTSIDE both route-group root
 * layouts (no root layout.tsx exists), so it got no ThemeProvider, no fonts,
 * no globals.css: a bare unstyled white LTR page (live-proven in r111).
 *
 * By placing the catch-all INSIDE the (public) group, unmatched URLs now render
 * through the full (public) root layout (theme + fonts + CSS + RTL shell), and
 * calling notFound() here preserves the correct 404 status code while handing
 * rendering to the themed (public)/not-found.tsx boundary (layer 2).
 *
 * The root not-found.tsx (layer 3) stays as a self-contained zero-CSS fallback
 * for the paths Next.js still renders through its error shell.
 */
export const metadata: Metadata = {
        title: '404 - الصفحة غير موجودة',
        description: 'الرابط الذي تبحث عنه غير صحيح أو تم نقله.',
        // 404s must never enter the index — belt & suspenders: the themed
        // boundary (layer 2) also renders a hoisted <meta robots> tag.
        robots: { index: false, follow: false },
};

export default function NotFoundCatchAllPage() {
        notFound();
}
