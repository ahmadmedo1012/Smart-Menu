import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
        output: 'standalone',
        turbopack: {
                root: process.cwd(),
        },
        // round85-B4: htmlLimitedBots narrowed from /.*/ to Next's built-in bot
        // list. The old override blocked streaming for EVERY user agent — real
        // users waited for the full HTML buffer on dynamic pages just so bots
        // could get resolved metadata. Next's default regex still gives crawlers
        // (the SEO surface) metadata-resolved, non-streamed HTML — and the
        // /menu/[slug] route keeps REAL 404s for bots because it deliberately
        // has no loading boundary (nothing flushes before the existence gate
        // resolves), which was the original reason for the override.
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
                        // round85-B7: immutable caching for fingerprint-free public assets.
                        // ~1.6MB of fonts/video/lottie files previously revalidated on every
                        // QR visit (Vercel static default is must-revalidate) — now cached for
                        // a year with zero round trips for repeat visitors.
                        {
                                source: '/fonts/:path*',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                                ],
                        },
                        {
                                source: '/video/:path*',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                                ],
                        },
                        {
                                source: '/animations/:path*',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                                ],
                        },
                        // OG card re-renders on rebrand — cache for a day + serve stale while
                        // revalidating instead of a hard year
                        {
                                source: '/og-default.png',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
                                ],
                        },
                        // apple-touch-icon / icon PNGs are stable but may be re-generated
                        {
                                source: '/icon-512.png',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
                                ],
                        },
                ];
        },
};

export default nextConfig;
