import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
        // r98-deploy-fix (السبب الجذري الثاني لفشل عمليات النشر الست):
        // next 16.3.x + output:'standalone' + Vercel = فشل حتمي في onBuildComplete
        // (ENOENT .next/next-server.js.nft.json — vercel/next.js#96646). البناء
        // نفسه يكتمل ثم ينهار في خطاف Vercel عند تجميع الـ lambdas: 16.3 أوقف
        // إصدار ملف تتبع next-server (is_using_adapter() early return من
        // #93684) بينما onBuildComplete ما زال يقرؤه. الإصلاح دخل canary فقط
        // (14 أغسطس #97287) ويشحن في 16.4.0 — لم يُلحق بأي 16.3.x مستقر
        // (v16.3.1 و v16.3.4 كلاهما على الـ hash المعطوب نفسه).
        // الحل المعتمد من المجتمع (#96646): standalone للبناءات المحلية/CI فقط
        // (e2e يعتمد node .next/standalone/server.js + postbuild ينسق الملفات
        // الثابتة إليه)، وundefined على Vercel حيث يُستخدم نشرها الأصلي —
        // مطابق للنمط القائم أدناه في experimental.cpus.
        output: process.env.VERCEL ? undefined : 'standalone',
        turbopack: {
                root: process.cwd(),
        },
        // round85-B4: htmlLimitedBots narrowed from /.*/ to Next's built-in bot
        // list. The old override blocked streaming for EVERY user agent — real
        // users waited for the full HTML buffer on dynamic pages just so bots
        // could get resolved metadata. Next's default regex still gives crawlers
        // (the SEO surface) metadata-resolved, non-streamed HTML — and the
        // /menu/[slug] route keeps REAL 404s for bots because no loading.tsx
        // may sit ABOVE `[slug]/layout` (the existence gate: notFound()
        // resolves there before anything flushes). The `[slug]/loading.tsx`
        // INSIDE the gate is safe and covers cold-nav transitions — do NOT
        // delete it again, and do NOT re-add a parent (public)/menu/loading.tsx
        // (that parent is what caused the r119 soft-404s). 404 contract pinned
        // by tests/e2e/full-sweep.test.ts. (r121-B-6: comment corrected — it
        // used to claim the route has no loading boundary at all.)
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

        // round97-X3 (A1 finding): /register and /dashboard are live 404s —
        // legacy entry points users still type/bookmark. Signup lives at
        // /subscribe; dashboards live at /owner (and /admin). Permanent (308)
        // so search engines drop the dead URLs and carry the link equity over.
        async redirects() {
                return [
                        { source: '/register', destination: '/subscribe', permanent: true },
                        { source: '/dashboard', destination: '/owner', permanent: true },
                ];
        },

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
                                        // round89-B2 (dx-4 #5): COOP/CORP here (not only in proxy.ts) so
                                        // static assets — which the fixed B-1 matcher now skips entirely —
                                        // still carry the pair. Values identical to proxy.ts: pages/API get
                                        // them from either layer (same value, no conflict), assets only here.
                                        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
                                        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
                                        // CSP via proxy.ts for nonce support — this header is overridden by middleware
                                        // on Vercel, middleware CSP takes precedence for dynamic routes
                                ],
                        },
                        // round85-B7: immutable caching for fingerprint-free public assets.
                        // ~1.6MB of font files previously revalidated on every
                        // QR visit (Vercel static default is must-revalidate) — now cached for
                        // a year with zero round trips for repeat visitors.
                        // (round87-C2: /animations rule dropped — the .lottie cluster was deleted)
                        {
                                source: '/fonts/:path*',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                                ],
                        },
                        // r132 (A3 should#7): the /video/:path* immutable rule deleted —
                        // public/video/ itself is gone (promo.mp4 removed round94);
                        // the rule matched nothing. The r121-G-3 /demo/:path* rule
                        // below carries the image-caching story now.
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
                        // r110-F4: unify the icon-PNG family policy — icon-192 and
                        // apple-touch-icon are the same "stable but regenerable in
                        // place" assets as icon-512 (rebrandable), yet they had NO
                        // rule and fell back to revalidate-on-every-visit. A PWA
                        // home-screen install fetches all three; two of them
                        // round-tripped every time. Same policy as icon-512/brand-icon.
                        {
                                source: '/icon-192.png',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
                                ],
                        },
                        {
                                source: '/apple-touch-icon.png',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
                                ],
                        },
                        // round92-D3 (plan D3, from 1-d P1 finding): the two heaviest public
                        // images — main21.webp (122K, ShowcaseSection) and hero-phone.webp
                        // (77K, HeroSection) — had NO rule and were re-downloaded on every
                        // visit (~197K per new QR scan). DELETED r132 (A3 §1.1): both files
                        // died with the r128-F1b/r129 landing redesigns (zero render sites,
                        // 199.5KB shipped on every deploy) — their cache rules went with
                        // them, along with the (already-matching-nothing) /video/:path*
                        // rule above.
                        // round94-W3 (A-Low6): brand-icon.png had NO rule — every direct
                        // fetch revalidated (max-age=0, must-revalidate). In practice it is
                        // rendered through _next/image (Header/Footer/login — the optimizer
                        // already serves those immutable-year), so the direct URL is hit
                        // rarely; still, it is a stable brand mark in the icon-PNG family
                        // (regenerable in place on a rebrand) → icon-512's policy (a week +
                        // SWR a day), not immutable, so an in-place swap reaches visitors.
                        {
                                source: '/brand-icon.png',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
                                ],
                        },
                        // r121-G-3: /demo/* (28 webp demo-restaurant assets, ~1.4MB total)
                        // had NO rule — every direct fetch revalidated (live-probed:
                        // max-age=0, must-revalidate). They are demo-stable but
                        // regenerable IN PLACE (r96-generate-demo-images.sh writes the
                        // same filenames), so they get the "stable but regenerable"
                        // week + SWR-a-day policy (the icon-512 family) — a regenerated
                        // demo/<name>.webp must reach visitors within the week. NOTE: this rule must live HERE,
                        // not proxy.ts — the proxy matcher deliberately skips image
                        // extensions (round89-B1), so a proxy rule can never see
                        // /demo/*.webp; static-asset caching has always been this
                        // file's domain (cache-page ownership per r121-B-1/N-6 stays
                        // with proxy.ts). The /_next/image derivatives were live-probed:
                        // Vercel already edge-caches them (x-vercel-cache: HIT, age
                        // grows) behind the optimizer's own Cache-Control — the
                        // optimizer's headers stay untouched (platform-owned).
                        {
                                source: '/demo/:path*',
                                headers: [
                                        { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
                                ],
                        },
                ];
        },
};

export default nextConfig;
