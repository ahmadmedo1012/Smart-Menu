'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { Check, Languages, Smartphone } from 'lucide-react';
// r128-F1a: «Orbit Ink» landing layer — tokens (§1), marquee (§3), chrome
// (§4), megamenu, button families, grain veil + the r128-F1b section
// families (hero sky, trust, categories constellation, journey light path,
// progress rings, restaurants ground plate, roles ledger, finale, faq,
// footer). Ships with the landing route only; everything is scoped under
// the `.landing` wrapper class below, so product tokens/pins in
// globals.css are untouched (R4).
import '../../app/landing.css';
import { LandingHeader } from './LandingHeader';
import { HeroDepthLayer } from './HeroDepthLayer';
import { HeroOrbits } from './HeroOrbits';
import { MagneticGoldLink } from './MagneticGoldLink';
import { LandingMarquee } from './LandingMarquee';
import { CategoriesSection } from './CategoriesSection';
import { JourneySection } from './JourneySection';
import { ProgressSection } from './ProgressSection';
import { RestaurantsSection } from './RestaurantsSection';
import { RolesSection } from './RolesSection';
import { FinaleCta } from './FinaleCta';
import { LandingFaq } from './LandingFaq';
import { LandingFooter } from './LandingFooter';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import { CountUp } from '@/components/ui/CountUp';
import { RevealCssClass } from '@/hooks/useReveal';
import { fetchPublicStats, type PublicStats } from './landing-data';
import type { FeaturedRestaurant } from '@/lib/landing';

/* Marquee vocabulary — the platform's real menu-domain names: the four
   default categories (the auto-seeded set every new menu starts with)
   + the shipped feature/ordering vocabulary from the home's own copy.
   The marquee kit duplicates the list ×2 for the seamless 42s RTL loop. */
const MARQUEE_ITEMS = [
        "المنيو الرقمي",
        "طلبات عبر واتساب",
        "مشروبات ساخنة",
        "QR كود مخصص",
        "مشروبات باردة",
        "لوحة تحكم عربية",
        "حلويات",
        "وجبات خفيفة",
        "برنامج ولاء ومكافآت",
        "داخل المكان · سفري · توصيل",
        "بدون تسجيل للزبون",
        "منيو يشرح نفسه",
];

export function HomePage({
        initialStats = null,
        initialFeatured = null,
}: {
        // round85-B2: rendered server-side into the ISR page — with these present,
        // the landing renders complete on first paint and the fetch effect is a
        // no-op (fallback only).
        initialStats?: PublicStats | null;
        initialFeatured?: FeaturedRestaurant[] | null;
}) {
        const [stats, setStats] = useState<PublicStats | null>(initialStats);
        const [featured, setFeatured] = useState<FeaturedRestaurant[] | null>(initialFeatured);
        // Bumped by the retry affordances to re-run the fetch effect without a
        // page reload.
        const [retryKey, setRetryKey] = useState(0);
        // True only when a request actually failed (never on AbortError) — drives
        // the retry affordances under the trust band / restaurants plate.
        const [statsFailed, setStatsFailed] = useState(false);
        const [featuredFailed, setFeaturedFailed] = useState(false);

        const retry = useCallback(() => {
                setStats(null);
                setFeatured(null);
                setStatsFailed(false);
                setFeaturedFailed(false);
                setRetryKey((k) => k + 1);
        }, []);

        useEffect(() => {
                const controller = new AbortController();
                // round85-B2: server-provided initial data skips the client fetch
                // entirely; the retry affordances reset state to null and re-run
                // this effect (the fetches below are the fallback path).
                if (stats === null) {
                        fetchPublicStats()
                                .then((s) => {
                                        if (!s || typeof s.totalRestaurants !== 'number') throw new Error('bad stats payload');
                                        setStats(s);
                                })
                                .catch((error) => {
                                        if (error instanceof DOMException && error.name === 'AbortError') return;
                                        // Keep the section in its honest fallback state (null) instead of
                                        // silently vanishing — a transient failure shouldn't wipe the stats
                                        // cells for the visit.
                                        setStats(null);
                                        setStatsFailed(true);
                                });
                }
                if (featured === null) {
                        fetch('/api/public/featured', { signal: controller.signal })
                                .then((r) => {
                                        if (!r.ok) throw new Error(`HTTP ${r.status}`);
                                        return r.json();
                                })
                                .then((d) => setFeatured(d.data ?? []))
                                .catch((error) => {
                                        if (error instanceof DOMException && error.name === 'AbortError') return;
                                        // null keeps the honest loading state visible (with retry
                                        // affordance); [] would blank the plate silently.
                                        setFeatured(null);
                                        setFeaturedFailed(true);
                                });
                }
                return () => controller.abort();
        }, [retryKey, stats, featured]);

        /* Trust-band cells — the two REAL live figures (مطعم مسجل / حساب
            نشط — the public stats surface's entire payload). When the live
            payload is unavailable the cells degrade honestly to "—" with the
            retry affordance; NEVER a fabricated figure (r82). */
        const trustCells = stats
                ? [
                          { value: `+${stats.totalRestaurants}`, label: 'مطعم مسجل' },
                          { value: `+${stats.totalUsers}`, label: 'حساب نشط' },
                  ]
                : [
                          { value: '—', label: 'مطعم مسجل' },
                          { value: '—', label: 'حساب نشط' },
                  ];

        return (
                /* r128-F1b: `.landing` wrapper — the whole page is the Madarek
                   journey now (PORT-KIT §5 anatomy, golden Smart-Link reference
                   commit 7a1fac7): hero sky → domain marquee → trust → categories
                   constellation → 5-station journey + light path --sp → progress
                   story --sp → restaurants ground plate → roles → finale → faq. */
                <div className="landing">
                        <LandingHeader />

                        <main id="main-content">
                                {/* ═══ الفصل ٠ — المدار: the hero sky ═══ */}
                                <section className="ln-hero" aria-label="الربط الذكي — منيو رقمي لمطعمك">
                                        {/* living sky: starfield depth plane + the categories'
                                            orbit chart (flat SVG grammar — thin 1px cream/lime
                                            lines, nodes, horizon) */}
                                        <div className="ln-hero-sky" aria-hidden="true">
                                                <HeroDepthLayer />
                                                <HeroOrbits className="ln-hero-canvas" />
                                        </div>

                                        <div className="ln-hero-content">
                                                <RevealCssClass as="p" className="ln-hero-eyebrow">
                                                        <span className="ln-mono">الربط الذكي · Smart Menu · منيو رقمي للمطاعم</span>
                                                </RevealCssClass>

                                                {/* h1 + sub paint INSTANTLY — rendered inline in the
                                                    SSR HTML, no reveal, no client gate (LCP doctrine).
                                                    One lime word: واتساب. */}
                                                <h1 className="ln-hero-title">
                                                        <span className="ln-hero-line">منيو رقمي <em>لمطعمك</em></span>
                                                        <span className="ln-hero-line">والطلبات تصلك <em className="ln-hero-gold">على واتساب</em></span>
                                                </h1>

                                                <p className="ln-hero-sub">
                                                        أنشئ منيو واضحاً، استقبل الطلبات على واتساب، وتابع أداء مطعمك من لوحة واحدة.
                                                </p>

                                                <RevealCssClass as="div" className="ln-hero-actions" delay={3}>
                                                        <MagneticGoldLink href="/subscribe" withArrow ariaLabel="ابدأ مجاناً — إنشاء حساب">
                                                                ابدأ مجاناً
                                                        </MagneticGoldLink>
                                                        <a href="#categories" className="ln-btn-ghost">اكتشف الرحلة</a>
                                                </RevealCssClass>

                                                <RevealCssClass as="ul" className="ln-hero-meta" delay={4}>
                                                        <li><Check size={13} aria-hidden="true" /> بدون بطاقة ائتمان</li>
                                                        <li aria-hidden="true" className="ln-hero-meta-dot" />
                                                        <li><Languages size={13} aria-hidden="true" /> واجهة عربية بالكامل</li>
                                                        <li aria-hidden="true" className="ln-hero-meta-dot" />
                                                        <li><Smartphone size={13} aria-hidden="true" /> بدون تثبيت للزبون</li>
                                                </RevealCssClass>
                                        </div>

                                        {/* scroll invitation */}
                                        <a href="#trust" className="ln-hero-scroll" aria-label="تابع الرحلة">
                                                <span className="ln-mono">تابع الرحلة</span>
                                                <span className="ln-hero-scroll-line" aria-hidden="true" />
                                        </a>
                                </section>

                                {/* ═══ شريط المنيو — مدار واحد تنتظم فيه الأسماء (marquee) ═══ */}
                                <LandingMarquee items={MARQUEE_ITEMS} />

                                {/* ═══ الفصل ١ — الثقة (quiet mono DATA band, live figures) ═══ */}
                                <section id="trust" className="ln-trust" aria-label="أرقام المنصّة">
                                        <div className="ln-trust-inner">
                                                {trustCells.map((s, i) => (
                                                        <Fragment key={s.label}>
                                                                {i > 0 && <span className="ln-trust-sep" aria-hidden="true" />}
                                                                <span className="ln-mono">
                                                                        <CountUp value={s.value} /> {s.label}
                                                                </span>
                                                        </Fragment>
                                                ))}
                                                {statsFailed && (
                                                        <button type="button" className="ln-btn-ghost" onClick={retry}>
                                                                <AnimatedRefreshCw className="size-3.5" aria-hidden="true" />
                                                                إعادة المحاولة
                                                        </button>
                                                )}
                                        </div>
                                </section>

                                {/* ═══ الفصل ٢ — مدار فئات المنيو ═══ */}
                                <CategoriesSection />

                                {/* ═══ الفصل ٣ — كيف يعمل المنيو الذكي ═══ */}
                                <JourneySection />

                                {/* ═══ الفصل ٤ — قصّة التقدّم ═══ */}
                                <ProgressSection stats={stats} />

                                {/* ═══ الفصل ٥ — الأرض: عالم المطاعم ═══ */}
                                <RestaurantsSection restaurants={featured} onRetry={featuredFailed ? retry : undefined} />

                                {/* ═══ الفصل ٦ — الأدوار ═══ */}
                                <RolesSection />

                                {/* ═══ الفصل ٧ — نقطة البداية ═══ */}
                                <FinaleCta />

                                {/* ═══ الأسئلة الشائعة — compact, ln-styled ═══ */}
                                <LandingFaq />
                        </main>

                        <LandingFooter />

                        {/* film-grain texture layer — last child, painted over the whole world */}
                        <div className="ln-grain" aria-hidden="true" />
                </div>
        );
}
