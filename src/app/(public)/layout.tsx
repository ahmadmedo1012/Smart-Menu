import type { Metadata, Viewport } from 'next';
import { preload } from 'react-dom';
import { BRAND_THEME_COLOR, BRAND_THEME_COLOR_LIGHT } from '@/lib/brand';
import { HIGH_CONTRAST_BOOT_SCRIPT } from '@/lib/high-contrast';
/* r131-F4 (r130 SO ruling): pre-paint theme boot — one resolution path with
   the provider (enableSystem OFF); see lib/theme-boot.ts. */
import { THEME_BOOT_SCRIPT } from '@/lib/theme-boot';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { ThemeProvider } from 'next-themes';
/* r131-F4: the ONE themed Toaster shell (bottom-end, no richColors) +
   runtime theme-color meta sync (SL pattern). */
import { AppToaster } from '@/components/ui/app-toaster';
import { ThemeColorSync } from '@/components/shared/theme-color-sync';
import { SITE_ORIGIN } from '@/lib/seo';
import { ServiceWorkerInit } from '@/components/shared/ServiceWorkerInit';
import { InstallPrompt } from '@/components/shared/InstallPrompt';
import { CartHydrator } from '@/components/shared/CartHydrator';
import { FloatingWhatsApp } from '@/components/shared/FloatingWhatsApp';
import { ConnectivityBanner } from '@/components/shared/ConnectivityBanner';
/* r121 (Q-1): بوابة Vercel لسكربت التحليلات — يحمّل فقط فوق منصة Vercel
   (خارجها كان يطلب /_vercel/insights/script.js ويرجع 404 على كل صفحة). */
import { VercelAnalytics } from '@/components/shared/VercelAnalytics';

import { GridPattern } from '@/components/ui/grid-pattern';
import { MotionProvider } from '@/components/shared/MotionProvider';
import '../globals.css';

/* ponytail: Cairo served local-first via /fonts/fonts.css — no render-blocking external Google Fonts round-trip, no next/font module-class dependency */

export const metadata: Metadata = {
        title: {
                default: 'الربط الذكي | Smart Menu — منيو رقمي للمطاعم والمقاهي',
                // r127-F3: template suffix unified to the canonical brand token
                // «الربط الذكي» — og/siteName/manifest/wordmark already use it
                // (was «%s | المنيو الذكي», the pre-unification brand split).
                template: '%s | الربط الذكي',
        },
        // canonical handled per-page (menu/[slug] sets its own; root default here)
        description: 'منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب، برنامج ولاء، وإحصائيات متقدمة',
        keywords: [
                'منيو رقمي',
                'Smart Menu',
                'مطعم',
                'مقهى',
                'طلب اونلاين',
                'واتساب',
                'قائمة طعام',
                'الربط الذكي',
        ],
        authors: [{ name: 'الربط الذكي' }],
        metadataBase: new URL(SITE_ORIGIN), // r126 (M7): unified origin
        openGraph: {
                title: 'الربط الذكي | Smart Menu',
                description: 'منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب',
                url: '/',
                siteName: 'الربط الذكي',
                images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'الربط الذكي — منيو رقمي ذكي للمطاعم والمقاهي' }],
                // r133 (A12 S13, ruling R11): ar_AR is the only Arabic locale
                // Facebook's scraper recognizes — ar_LY was silently dropped.
                locale: 'ar_AR',
                type: 'website',
        },
        twitter: {
                card: 'summary_large_image',
                title: 'الربط الذكي | Smart Menu',
                description: 'منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب',
                images: ['/og-default.png'],
        },
        // r121-L-5: the explicit default-index robots field is REMOVED — it
        // duplicated the crawler default (no meta emitted = index, follow) on
        // every public page and CONFLICTED with the hoisted noindex on 404s
        // (both meta tags rendered; most-restrictive won, but the dual emission
        // was fragile). Absence is byte-identical behavior for every live
        // public page; 404s now emit exactly one robots meta.
};

export const viewport: Viewport = {
        themeColor: BRAND_THEME_COLOR,
};

export default async function RootLayout({
        children,
}: Readonly<{
        children: React.ReactNode;
}>) {
        // round94-W3 (A-Low5 — duplicate font preloads, live-measured on /): the
        // raw <link rel="preload"> JSX this replaces was emitted TWICE in
        // production HTML — React 19's RSC serializer auto-converts every
        // preload link ELEMENT into a :HL hint (flushed at the very top of
        // <head>) AND the element itself renders again in place, so each font
        // carried two identical preload tags (2×2 per page). The module-level
        // preload() API emits exactly ONE hoisted hint per font (deduped by
        // the RSC dispatcher) with no in-place copy — same LCP win, half the
        // tags. React forces crossorigin=anonymous for as:"font" (matches the
        // CSS-initiated font fetch, same as the old crossOrigin="anonymous").
        /* MADAREK PARITY — first paint preloads only the two arabic subsets
           (~86 KB): IBM Plex Sans Arabic 400 + 700 (font-display: swap on the
           rest; r132/A3 §1.3: the never-fetched Cairo/Readex/Naskh/Serif
           fallback faces were deleted — /fonts/fonts.css ships Plex only). */
        preload('/fonts/plex-sans-arabic-400-normal-arabic.woff2', { as: 'font', type: 'font/woff2' });
        preload('/fonts/plex-sans-arabic-700-normal-arabic.woff2', { as: 'font', type: 'font/woff2' });
        const nonce = '';
        // r119-S5-P1-3: <html>/<head>/<body> now come from the ROOT layout —
        // the multiple-root-layouts pattern left every 404 rendering in Next's
        // bare error shell (no lang/dir, homepage title, no CSS). The links/metas
        // below hoist into <head> via React 19; the boot script renders at body
        // top (still pre-paint — it precedes every theme-relevant node).
        return (
                <>
                        <link rel="manifest" href="/manifest.json" />
                        {/* r133 (A3 N5): dual favicon surface consolidated — the App-Router
                          convention file (src/app/favicon.ico) is the ONE declared icon; the explicit
                          /favicon.png link rendered a second competing surface. */}
                        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
                        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
                        {/* round84: apple-touch-icon.png now generated (180x180, lanczos3) — iOS home-screen shows the brand mark */}
                        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                        {/* ponytail: theme-color unified to the brand night/cream pair — via lib/brand.ts constant (amber was retired r126) */}
                        <meta name="theme-color" media="(prefers-color-scheme: light)" content={BRAND_THEME_COLOR_LIGHT} />
                        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={BRAND_THEME_COLOR} />
                        <meta name="mobile-web-app-capable" content="yes" />
                        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                        <meta name="apple-mobile-web-app-title" content="Smart Menu" />
                        {/* eslint-disable-next-line @next/next/no-css-tags */}
                        <link rel="stylesheet" href="/fonts/fonts.css" />
                        {/* round88-E2: high-contrast/large-text pre-paint bootstrap (next-themes
                                pattern — reads localStorage before first paint so the mode never
                                flashes). Public pages run under the cacheable-page CSP which allows
                                'unsafe-inline' scripts, so no nonce is needed here. */}
                        <script
                                dangerouslySetInnerHTML={{ __html: HIGH_CONTRAST_BOOT_SCRIPT }}
                        />
                        {/* r131-F4 (r130 SO ruling): pre-paint theme boot — dark
                            default, .light only when stored; public pages run under the
                            cacheable-page CSP which allows 'unsafe-inline'. */}
                        <script
                                dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }}
                        />
                        <script
                                type="application/ld+json"
                                nonce={nonce}
                                dangerouslySetInnerHTML={{
                                        __html: JSON.stringify({
                                                '@context': 'https://schema.org',
                                                '@type': 'SoftwareApplication',
                                                name: 'الربط الذكي | Smart Menu',
                                                description: 'منيو رقمي ذكي للمطاعم والمقاهي',
                                                applicationCategory: 'BusinessApplication',
                                                operatingSystem: 'Web',
                                                offers: { '@type': 'Offer', price: '0', priceCurrency: 'LYD' },
                                        }),
                                }}
                        />
                        {/* r96-W4a: توأم SmartBot — توهج الصفحة الشعاعي العلوي.
                            r119: كان على <body> عبر style inline — انتقل إلى طبقة ثابتة
                            خلف المحتوى (نفس الأثر البصري، body لم يعد ملكنا من الجذر). */}
                        <div
                                aria-hidden="true"
                                className="pointer-events-none fixed inset-0 -z-10"
                                style={{ background: 'var(--background-radial), var(--background)' }}
                        />
                        <a
                                href="#main-content"
                                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:end-4 focus:z-(--z-toast) focus:px-6 focus:py-3 focus:rounded-lg focus:bg-orange focus:text-orange-foreground focus:text-sm focus:font-medium focus:outline-none focus:shadow-lg focus:ring-2 focus:ring-ring/60"
                        >
                                تخطى إلى المحتوى الرئيسي
                        </a>
                        <div className="grain-overlay" />
                                {/* r95: داكن أولاً — توأمة SmartBot.
                                    r131-F4 (r130 SO ruling): enableSystem OFF — one resolution path
                                    with the THEME_BOOT_SCRIPT above; disableTransitionOnChange kills
                                    the whole-app color cross-fade on toggle (SO twin). */}
                                <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange nonce={nonce}>
                                        <GridPattern
                                                width={60}
                                                height={60}
                                                className="[color:var(--grid-line)] [mask-image:radial-gradient(1200px_circle_at_50%_25%,white_20%,transparent)]"
                                                style={
                                                        {
                                                                opacity: 0.14,
                                                                '--grid-fill': 'var(--grid-fill)',
                                                                '--grid-square': 'var(--grid-square)',
                                                        } as React.CSSProperties
                                                }
                                        />
                                        <ServiceWorkerInit />
                                        <InstallPrompt />
                                        <CartHydrator />
                                        <MotionProvider>
                                                {/* a11y(round84): fixed floating controls (scroll-to-top + WhatsApp)
                                                 * must live INSIDE a landmark (axe region rule). position:fixed is
                                                 * unaffected by DOM order — MotionProvider applies no transform. */}
                                                <main id="main-content" tabIndex={-1} className="focus:outline-none">
                                                        <ScrollToTop />
                                                        {/* round88-E4: connectivity banner (offline warning + auto-hide
                                                                on reconnect) — full-width fixed strip at the overlay band. */}
                                                        <ConnectivityBanner />
                                                        {children}
                                                        <FloatingWhatsApp />
                                                </main>
                                        </MotionProvider>
                                        {/* r126 (P4-F1 M10/B5): sonner ships z-index 999999999 — pin to the
                                                    Madarek --z-toast rung (500, above modals, below the lightbox);
                                                    entrance rides the reveal token + --ease-out (audit B5). */}
                                        {/* r131-F4: themed Toaster shell (bottom-end, no richColors) +
                                            runtime theme-color sync — see ui/app-toaster.tsx. */}
                                        <AppToaster />
                                        <ThemeColorSync />
                                        <VercelAnalytics />
                                </ThemeProvider>
                </>
        );
}
