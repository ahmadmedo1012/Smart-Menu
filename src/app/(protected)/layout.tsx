import type { Metadata, Viewport } from 'next';
import { preload } from 'react-dom';
import { BRAND_THEME_COLOR, BRAND_THEME_COLOR_LIGHT } from '@/lib/brand';
import { HIGH_CONTRAST_BOOT_SCRIPT } from '@/lib/high-contrast';
import { connection } from 'next/server';
import { headers } from 'next/headers.js';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { SITE_ORIGIN } from '@/lib/seo';
import { ServiceWorkerInit } from '@/components/shared/ServiceWorkerInit';
import { InstallPrompt } from '@/components/shared/InstallPrompt';
import { CartHydrator } from '@/components/shared/CartHydrator';
import { FloatingWhatsApp } from '@/components/shared/FloatingWhatsApp';
import { ConnectivityBanner } from '@/components/shared/ConnectivityBanner';
import { VercelAnalytics } from '@/components/shared/VercelAnalytics';

import { GridPattern } from '@/components/ui/grid-pattern';
import { MotionProvider } from '@/components/shared/MotionProvider';
import '../globals.css';

/* ponytail: Cairo served local-first via /fonts/fonts.css — no render-blocking external Google Fonts round-trip, no next/font module-class dependency */

export const metadata: Metadata = {
        title: {
                default: 'الربط الذكي | Smart Menu — منيو رقمي للمطاعم والمقاهي',
                template: '%s | المنيو الذكي',
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
                locale: 'ar_LY',
                type: 'website',
        },
        twitter: {
                card: 'summary_large_image',
                title: 'الربط الذكي | Smart Menu',
                description: 'منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب',
                images: ['/og-default.png'],
        },
        robots: {
                // r121-L-1: the protected tree is auth-gated by design — the safe
                // default is noindex. The four page-level robots overrides
                // (login/subscribe/cart/order-confirmed layouts) keep winning;
                // this closes the latent gap where any future owner/admin route
                // would inherit `index,follow` (live mitigated by the proxy 307
                // + robots.ts disallow, but the default should be safe, not opt-in).
                index: false,
                follow: true,
        },
};

export const viewport: Viewport = {
        themeColor: BRAND_THEME_COLOR,
};

export default async function RootLayout({
        children,
}: Readonly<{
        children: React.ReactNode;
}>) {
        // Protected-group pages are served behind a per-request CSP nonce from
        // proxy.ts. Opt into dynamic rendering so the nonce is available to the
        // client-side theme bootstrap script during SSR.
        await connection();
        // round94-W3 (A-Low5 — duplicate font preloads): raw <link rel="preload">
        // JSX renders TWICE in the HTML (the RSC serializer auto-emits a :HL hint
        // for every preload link ELEMENT *and* the element itself renders again in
        // place). preload() emits exactly ONE hoisted hint per font — same fix as
        // (public)/layout.tsx, applied here because protected pages had the same
        // 2×2 duplication. React forces crossorigin=anonymous for as:"font".
        /* MADAREK PARITY — first paint preloads only the two arabic subsets
           (~86 KB): IBM Plex Sans Arabic 400 + 700 (font-display: swap on the
           rest; Cairo/Readex stay registered as fallbacks via /fonts/fonts.css). */
        preload('/fonts/plex-sans-arabic-400-normal-arabic.woff2', { as: 'font', type: 'font/woff2' });
        preload('/fonts/plex-sans-arabic-700-normal-arabic.woff2', { as: 'font', type: 'font/woff2' });
        // r93-W2a (U1): خط العناوين — المصدر الواحد للحقيقة هو تعريف @theme inline
        // في globals.css (Readex Pro أولًا) وسطر :root مرآة مطابقة له؛ هذا الـ
        // preload يطابق الجذر العام ويمنع وميض تبديل خط العناوين هنا.
        // (تعليق r88-A2 القديم ادّعى أن Readex Pro «فعّال في الوضع الفاتح» —
        // غير دقيق؛ وُحّد في r93-W2a.) — نُقل إلى هنا مع تحويل التخطيط إلى
        // fragment في r119 (الجذر يملك <html>/<body> الآن).
        const nonce = (await headers()).get('x-nonce') ?? '';
        // r119-S5-P1-3: <html>/<head>/<body> now come from the ROOT layout
        // (see src/app/layout.tsx) — the links/metas below hoist into <head> via
        // React 19; the nonce'd boot script renders at body top, still pre-paint.
        return (
                <>
                        <link rel="manifest" href="/manifest.json" />
                        <link rel="icon" type="image/png" href="/favicon.png" />
                        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
                        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
                        {/* round84: apple-touch-icon.png now generated (180x180, lanczos3) — iOS home-screen shows the brand mark */}
                        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                        {/* ponytail: theme-color unified to brand amber (manifest + offline.html + both layouts) — via lib/brand.ts constant */}
                        <meta name="theme-color" media="(prefers-color-scheme: light)" content={BRAND_THEME_COLOR_LIGHT} />
                        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={BRAND_THEME_COLOR} />
                        <meta name="mobile-web-app-capable" content="yes" />
                        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                        <meta name="apple-mobile-web-app-title" content="Smart Menu" />
                        {/* eslint-disable-next-line @next/next/no-css-tags */}
                        <link rel="stylesheet" href="/fonts/fonts.css" />
                        {/* round88-E2: high-contrast/large-text pre-paint bootstrap (next-themes
                                pattern — no first-paint flash). Protected pages run under the
                                per-request nonce CSP from proxy.ts, so the script carries the
                                same nonce Next stamps on every other inline script here. */}
                        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: HIGH_CONTRAST_BOOT_SCRIPT }} />
                                <a
                                        href="#main-content"
                                        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:end-4 focus:z-(--z-toast) focus:px-6 focus:py-3 focus:rounded-lg focus:bg-orange focus:text-orange-foreground focus:text-sm focus:font-medium focus:outline-none focus:shadow-lg focus:ring-2 focus:ring-ring/60"
                                >
                                        تخطى إلى المحتوى الرئيسي
                                </a>
                                <div className="grain-overlay" />
                                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem nonce={nonce}> {/* r95: داكن أولاً — توأمة SmartBot (توحيد مع العام) */}
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
                                                {/* r121-K-3: the skip-link TARGET no longer lives here — the group
                                                 * main's first tabbable children were each page's nav (Header /
                                                 * dashboard sidebar), so the skip "bypass" landed right back in
                                                 * the navigation. Each sub-layout now stamps
                                                 * id="main-content" on its real first content element (past the
                                                 * nav): the owner/admin shells, order-confirmed's content root,
                                                 * and the login/subscribe/cart layout wrappers. */}
                                                <main>
                                                        <ScrollToTop />
                                                        {/* round88-E4: connectivity banner (offline warning + auto-hide
                                                                on reconnect) — same strip as the public tree. */}
                                                        <ConnectivityBanner />
                                                        {children}
                                                        <FloatingWhatsApp />
                                                </main>
                                        </MotionProvider>
                                        {/* r126 (P4-F1 M10/B5): sonner ships z-index 999999999 — pin to the
                                                    Madarek --z-toast rung (500, above modals, below the lightbox);
                                                    entrance rides the reveal token + --ease-out (audit B5). */}
                                        <Toaster
                                                position="top-center"
                                                richColors
                                                closeButton
                                                dir="rtl"
                                                style={{ zIndex: 'var(--z-toast, 500)' }}
                                                toastOptions={{
                                                        style: {
                                                                animation: 'slide-up var(--motion-duration-reveal, 360ms) var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))',
                                                                borderRadius: 'var(--r-lg, 12px)',
                                                                padding: '8px',
                                                        },
                                                        className: 'border border-border/30 shadow-xl backdrop-blur-xl',
                                                }}
                                        />
                                        <VercelAnalytics />
                                </ThemeProvider>
                </>
        );
}
