import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	output: 'standalone',
	turbopack: {
		root: process.cwd(),
	},
	// Resolve generateMetadata before streaming starts for crawlers. The dynamic
	// public /menu/[slug] route intentionally has no loading boundary, so an
	// unknown slug can keep a real 404 status instead of becoming a soft-404.
	// Menu URLs are the SEO surface of the product, so blocking metadata is
	// worth the small cost of one cached restaurant lookup.
	htmlLimitedBots: /.*/,
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'vercel.app' },
			{ protocol: 'https', hostname: '*.vercel.app' },
			{ protocol: 'https', hostname: 'images.unsplash.com' },
			{ protocol: 'https', hostname: 'plus.unsplash.com' },
			// Vercel Blob storage (uploaded item/restaurant/receipt images)
			{ protocol: 'https', hostname: '*.vercel-storage.com' },
			{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' },
			{ protocol: 'https', hostname: '*.blob.vercel-storage.com' },
		],
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [640, 750, 1080, 1200, 1920],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
	},

	allowedDevOrigins: ['.monkeycode-ai.live'],
	experimental: {
		optimizePackageImports: ['lucide-react', '@base-ui/react', 'sonner'],
		// Local builds: Next sizes its build/static worker pool from cpus; on
		// big hosts that's 15 workers hammering the single Neon pool, and one
		// cold-cache timeout aborts the whole build. Cap to 2 locally so DB
		// queries serialize. Vercel deployments keep their default — remote
		// builds aren't DB-bound the same way.
		...(process.env.VERCEL && process.env.NEXT_PUBLIC_VERCEL_ENV ? {} : { cpus: 2 }),
	},

	poweredByHeader: false,
	reactStrictMode: true,
	compress: true,

	async headers() {
		// HSTS only on Vercel production — on dev OR a local prod server running
		// plain HTTP, WebKit upgrades every subresource to https://localhost and
		// the page never hydrates. proxy.ts enforces the protocol check too.
		const hsts =
			process.env.NODE_ENV === 'production' && process.env.VERCEL
				? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
				: [];
		return [
			{
				source: '/(.*)',
				headers: [
					...hsts,
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'X-Frame-Options', value: 'DENY' },
					{ key: 'X-DNS-Prefetch-Control', value: 'on' },
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
					{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
					// CSP via proxy.ts for nonce support — this header is overridden by middleware
					// on Vercel, middleware CSP takes precedence for dynamic routes
				],
			},
		];
	},
};

export default nextConfig;
