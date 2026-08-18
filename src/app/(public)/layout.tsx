import type { Metadata } from 'next';
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
		images: [{ url: '/icon-512.png', width: 512, height: 512 }],
		locale: 'ar_LY',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'الربط الذكي | Smart Menu',
		description: 'منيو رقمي ذكي للمطاعم والمقاهي مع الطلب عبر واتساب',
		images: ['/icon-512.png'],
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const nonce = '';
	return (
		<html lang="ar" dir="rtl" suppressHydrationWarning>
			<head>
				<link rel="manifest" href="/manifest.json" />
				<link rel="icon" type="image/png" href="/favicon.png" />
				<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
				<link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
				{/* ponytail: generate /apple-touch-icon.png (180x180) from public/icon-512.png via any image resizer */}
				<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
				{/* ponytail: theme-color unified to brand orange #d97706 (manifest + offline.html + both layouts) */}
				<meta name="theme-color" media="(prefers-color-scheme: light)" content="#d97706" />
				<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#d97706" />
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
				{/* ponytail: Cairo is the only active font family (round84). The @font-face
				 * rules in fonts.css load lazily via unicode-range — no preloads needed for
				 * the fallback families (Noto Naskh / Noto Sans / Readex Pro), which are
				 * unused in the UI. Preloading them wasted ~277KB on mobile. */}
				{/* Cairo handles via next/font/google — no render-blocking external CSS */}
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
			</head>
			<body className="min-h-screen flex flex-col antialiased overflow-x-clip bg-[var(--background-radial),var(--background)]">
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:end-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-sm focus:bg-orange focus:text-white focus:text-sm focus:font-medium focus:outline-none"
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
								'--grid-fill': 'var(--grid-fill)',
								'--grid-square': 'var(--grid-square)',
							} as React.CSSProperties
						}
					/>
					<ScrollToTop />
					<ServiceWorkerInit />
					<InstallPrompt />
					<CartHydrator />
					<MotionProvider>
						<main id="main-content">{children}</main>
					</MotionProvider>
					<FloatingWhatsApp />
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
