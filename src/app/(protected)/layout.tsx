import type { Metadata, Viewport } from 'next';
import { BRAND_THEME_COLOR } from '@/lib/brand';
import { connection } from 'next/server';
import { headers } from 'next/headers.js';
import { ScrollToTop } from '@/components/shared/ScrollToTop';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { ServiceWorkerInit } from '@/components/shared/ServiceWorkerInit';
import { InstallPrompt } from '@/components/shared/InstallPrompt';
import { CartHydrator } from '@/components/shared/CartHydrator';
import { FloatingWhatsApp } from '@/components/shared/FloatingWhatsApp';
import { Analytics } from '@vercel/analytics/react';

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
	metadataBase: new URL(process.env.NEXT_PUBLIC_DOMAIN || 'https://smart-link.ly'),
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
		index: true,
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
	const nonce = (await headers()).get('x-nonce') ?? '';
	return (
		<html lang="ar" dir="rtl" suppressHydrationWarning>
			<head>
				<link rel="manifest" href="/manifest.json" />
				<link rel="icon" type="image/png" href="/favicon.png" />
				<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
				<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
				{/* round84: apple-touch-icon.png now generated (180x180, lanczos3) — iOS home-screen shows the brand mark */}
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                                {/* ponytail: theme-color unified to brand amber (manifest + offline.html + both layouts) — via lib/brand.ts constant */}
                                <meta name="theme-color" media="(prefers-color-scheme: light)" content={BRAND_THEME_COLOR} />
                                <meta name="theme-color" media="(prefers-color-scheme: dark)" content={BRAND_THEME_COLOR} />
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="Smart Menu" />
				{/* eslint-disable-next-line @next/next/no-css-tags */}
				<link rel="stylesheet" href="/fonts/fonts.css" />
				{/* LCP: preload the Arabic Cairo subset (the one that renders Arabic text) —
				 * fonts.css @font-face already has font-display: swap, so text paints in a
				 * fallback instantly and swaps once the woff2 arrives. Preloading moves the
				 * font fetch ahead of the CSS discovery, cutting the ~700ms block. */}
				<link rel="preload" as="font" type="font/woff2" href="/fonts/cairo-arabic.woff2" crossOrigin="anonymous" />
				{/* round88-A2 (fonts audit): Readex Pro IS active — globals.css resolves
				 * --font-heading to "Readex Pro" first in LIGHT theme and every h1-h5 uses
				 * it (the old comment here claimed it was unused; that predates the
				 * heading-face switch the PUBLIC layout already documents). Matching the
				 * public layout's preload removes the heading swap-flash on protected
				 * pages too. Noto Naskh/Noto Sans stay lazy via unicode-range. */}
				<link rel="preload" as="font" type="font/woff2" href="/fonts/readex-pro.woff2" crossOrigin="anonymous" />
			</head>
			<body className="flex min-h-dvh flex-col overflow-x-clip bg-background antialiased">
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:end-4 focus:z-[100] focus:px-6 focus:py-3 focus:rounded-lg focus:bg-orange focus:text-white focus:text-sm focus:font-medium focus:outline-none focus:shadow-lg focus:ring-2 focus:ring-orange/50"
				>
					تخطى إلى المحتوى الرئيسي
				</a>
				<div className="grain-overlay" />
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem nonce={nonce}>
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
						<main id="main-content">
							<ScrollToTop />
							{children}
							<FloatingWhatsApp />
						</main>
					</MotionProvider>
					<Toaster
						position="top-center"
						richColors
						closeButton
						toastOptions={{
							style: {
								animation: 'slide-up 0.35s cubic-bezier(0.16, 1, 0.2, 1)',
								borderRadius: '12px',
								padding: '8px',
							},
							className: 'border border-border/30 shadow-xl backdrop-blur-xl',
						}}
					/>
					<Analytics />
				</ThemeProvider>
			</body>
		</html>
	);
}
