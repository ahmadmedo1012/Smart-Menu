'use client';
import { Fragment, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Check, Languages, Smartphone } from 'lucide-react';
// r142 (task 2-b) — «المائدة» landing layer: a warm editorial culinary
// world (cream paper + ember + espresso ink) that replaces the Orbit-Ink
// dark stage entirely. The page READS as a printed menu being flipped:
// chapters carry course indexes, the hero leans a real menu card against
// the dish, and the finale flips to the espresso back-cover. Tokens are
// the --sm-* block in landing.css; everything is scoped under the
// `.landing` wrapper class, so product tokens/pins in globals.css are
// untouched (R4).
import '../../app/landing.css';
import { LandingHeader } from './LandingHeader';
import { HeroTable } from './HeroTable';
import { MagneticGoldLink } from './MagneticGoldLink';
import { MenuShowcaseSection } from './MenuShowcaseSection';
import { AmbienceSection } from './AmbienceSection';
import { LandingMarquee } from './LandingMarquee';
import { JourneySection } from './JourneySection';
import { RolesSection } from './RolesSection';
import { FinaleCta } from './FinaleCta';
import { LandingFaq } from './LandingFaq';
import { LandingFooter } from './LandingFooter';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import { CountUp } from '@/components/ui/CountUp';
import { RevealCssClass } from '@/hooks/useReveal';
import { fetchPublicStats, type PublicStats } from './landing-data';

/* P21-B retired the P12-2b three.js kitchen-island diorama (the file
 * itself is deleted); P21-W3-E authors the hero visual instead of
 * staging it with stock photos — the window is now a server-rendered
 * inline SVG still-life (see HeroTable + NightKitchenScene): no client
 * scene, no dynamic import, no WebGL, no image bytes on the landing.
 * The h1 still paints server-rendered, instant (LCP doctrine). */
/* Marquee vocabulary — the platform's real menu-domain names: the four
   default categories (the auto-seeded set every new menu starts with)
   + the shipped feature/ordering vocabulary from the home's own copy.
   The marquee kit duplicates the list ×2 for the seamless 42s RTL loop. */
/* W2-B1r: module-level useSyncExternalStore plumbing for introSeen — see the
   comment at the call site. getSnapshot must never throw (private mode /
   blocked sessionStorage) — it degrades to false. */
const INTRO_SEEN_KEY = 'smartmenu.intro.seen';
function introSeenSubscribe(_onStoreChange: () => void) {
        // sessionStorage is tab-scoped and has no change events for same-tab
        // writes; the only writer is this component's own effect. No-op.
        return () => undefined;
}
function introSeenSnapshot(): boolean {
        try {
                return window.sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
        } catch {
                return false;
        }
}
function introSeenServerSnapshot(): boolean {
        return false;
}

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
        "بدون تسجيل للعميل",
        "منيو يشرح نفسه",
];

export function HomePage({
        initialStats = null,
}: {
        // round85-B2: rendered server-side into the ISR page — with this
        // present, the landing renders complete on first paint and the fetch
        // effect is a no-op (fallback only). (r142: featured restaurants left
        // the landing with the old «عالم المطاعم» chapter; the live stats
        // line is the one honest data surface that stays.)
        initialStats?: PublicStats | null;
}) {
        const [stats, setStats] = useState<PublicStats | null>(initialStats);
        // Bumped by the retry affordance to re-run the fetch effect without a
        // page reload.
        const [retryKey, setRetryKey] = useState(0);
        // True only when a request actually failed (never on AbortError) — drives
        // the retry affordance under the trust line.
        const [statsFailed, setStatsFailed] = useState(false);

        /* r129 returning-visitor calm, kept in r142: first session visit plays
            the full hero-card entrance; later visits this session set
            data-intro-seen on .landing and the CSS drops the entrance to
            t-fast with zero delay. Product-scoped key (PORT-KIT §9.2 item 6:
            a shared-PC visit to a sibling product must not silence this
            entrance).
            W2-B1r (hydration defect, live-console-proven): this used to be a
            useState initializer reading sessionStorage DURING hydration —
            server renders data-intro-seen={undefined}, a returning visitor's
            client renders "true", React 19 reports the attribute mismatch
            ("tree hydrated but some attributes ... didn't match"). The
            sanctioned fix is useSyncExternalStore: hydration renders with the
            server snapshot (false), then React re-renders once with the real
            client value — no mismatch, attribute flips a tick after mount,
            which is also when the entrance animation would start anyway.
            subscribe is a no-op: sessionStorage is per-tab and the only writer
            is this component's own effect below (no storage events to hear). */
        const introSeen = useSyncExternalStore(
                introSeenSubscribe,
                introSeenSnapshot,
                introSeenServerSnapshot,
        );

        useEffect(() => {
                if (introSeen) return;
                try {
                        window.sessionStorage.setItem('smartmenu.intro.seen', '1');
                } catch {
                        // sessionStorage may be blocked in private mode — that's fine.
                }
        }, [introSeen]);

        const retry = useCallback(() => {
                setStats(null);
                setStatsFailed(false);
                setRetryKey((k) => k + 1);
        }, []);

        useEffect(() => {
                const controller = new AbortController();
                // round85-B2: server-provided initial data skips the client fetch
                // entirely; the retry affordance resets state to null and re-runs
                // this effect (the fetch below is the fallback path).
                if (stats === null) {
                        fetchPublicStats()
                                .then((s) => {
                                        if (!s || typeof s.totalRestaurants !== 'number') throw new Error('bad stats payload');
                                        setStats(s);
                                })
                                .catch((error) => {
                                        if (error instanceof DOMException && error.name === 'AbortError') return;
                                        // Keep the line in its honest fallback state (null) instead of
                                        // silently vanishing — a transient failure shouldn't wipe the
                                        // figures for the visit.
                                        setStats(null);
                                        setStatsFailed(true);
                                });
                }
                return () => controller.abort();
        }, [retryKey, stats]);

        /* Trust-line cells — the two REAL live figures (مطعم مسجل / صاحب
            مطعم — the public stats surface's entire payload, r143 D6: الاسم
            الثاني صار «صاحب مطعم» مطابقًا لتعريف العدّ role:owner). When the
            live payload is unavailable the cells degrade honestly to "—" with
            the retry affordance; NEVER a fabricated figure (r82). */
        const trustCells = stats
                ? [
                          { value: `+${stats.totalRestaurants}`, label: 'مطعم مسجل' },
                          { value: `+${stats.totalUsers}`, label: 'صاحب مطعم' },
                  ]
                : [
                          { value: '—', label: 'مطعم مسجل' },
                          { value: '—', label: 'صاحب مطعم' },
                  ];

        return (
                /* r142: `.landing` — the whole page is «المائدة» now: hero «أول
                   لقمة» → vocabulary marquee → live stats line → المنيو الحي →
                   من الطاولة إلى المطبخ → أجواء المكان → لصاحب المطعم →
                   الختام (espresso back-cover) + FAQ. r129 P0 stands: NO <main>
                   element here — the (public) layout already owns the single
                   main#main-content landmark; a second nested main was invalid
                   HTML (axe landmark-no-duplicate-main) and made the skip-link
                   target ambiguous. */
                <div className="landing" data-intro-seen={introSeen ? 'true' : undefined}>
                        {/* in-world skip link — ink pill above the grain, first Tab
                            stop; the shell's orange pill is hidden while the landing
                            is mounted (landing.css). */}
                        <a href="#main-content" className="ln-skip-link">
                                تخطَّ إلى المحتوى
                        </a>

                        <LandingHeader />

                        <div className="ln-landing-body">
                                {/* ═══ الصفحة الأولى — «أول لقمة»: the hero spread ═══ */}
                                <section className="ln-hero" aria-label="الربط الذكي — منيو رقمي لمطعمك">
                                        <div className="ln-hero-content">
                                                <RevealCssClass as="p" className="ln-hero-eyebrow">
                                                        <span className="ln-mono">أول لقمة · Smart Menu · منيو رقمي للمطاعم</span>
                                                </RevealCssClass>

                                                {/* LCP doctrine (r92-A7, carried): the h1 paints
                                                    server-rendered, instant — no reveal class, no
                                                    entrance animation, no pre-hydration style. The
                                                    hero is the menu's OPENING LINE, read at full
                                                    appetite. */}
                                                <h1 className="ln-hero-title">
                                                        <span className="ln-hero-line">منيوٌ يُقرأ بشهية،</span>
                                                        <span className="ln-hero-line">
                                                                والطلبات على <em className="ln-hero-ember">واتساب</em>
                                                        </span>
                                                </h1>

                                                <p className="ln-hero-sub">
                                                        Smart Menu يحوّل منيو مطعمك إلى مائدة رقمية: أصنافك
                                                        بصورها وأسعارها الواضحة، وطلب عميلك يصل مباشرة على
                                                        واتساب — بلا تطبيق وبلا تعقيد.
                                                </p>

                                                <RevealCssClass as="div" className="ln-hero-actions" delay={2}>
                                                        <MagneticGoldLink href="/subscribe" withArrow ariaLabel="ابدأ مجاناً — إنشاء حساب">
                                                                ابدأ مجاناً
                                                        </MagneticGoldLink>
                                                        <a href="#menu" className="ln-btn-ghost">اقرأ المنيو الحي</a>
                                                </RevealCssClass>

                                                <RevealCssClass as="ul" className="ln-hero-meta" delay={3}>
                                                        <li><Check size={13} aria-hidden="true" /> بدون بطاقة ائتمان</li>
                                                        <li aria-hidden="true" className="ln-hero-meta-dot" />
                                                        <li><Languages size={13} aria-hidden="true" /> واجهة عربية بالكامل</li>
                                                        <li aria-hidden="true" className="ln-hero-meta-dot" />
                                                        <li><Smartphone size={13} aria-hidden="true" /> بدون تثبيت للعميل</li>
                                                </RevealCssClass>
                                        </div>

                                        {/* مائدة أول لقمة — P21-W3-E: the
                                            restaurant «window» (the
                                            AUTHORED night-kitchen SVG
                                            still-life, one caption link)
                                            + the printed menu card resting
                                            on its corner — static tension,
                                            no diorama. ≤1024px the visual
                                            demotes to an in-flow block
                                            UNDER the copy — the LCP story
                                            stays first on phones. */}
                                        <HeroTable />

                                        {/* scroll invitation */}
                                        <a href="#menu" className="ln-hero-scroll" aria-label="تابع القراءة">
                                                <span className="ln-mono">اقلب الصفحة</span>
                                                <span className="ln-hero-scroll-line" aria-hidden="true" />
                                        </a>
                                </section>

                                {/* ═══ شريط المنيو — vocabulary ring (marquee) ═══ */}
                                <LandingMarquee items={MARQUEE_ITEMS} />

                                {/* ═══ سطر المائدة — quiet mono DATA line, live figures ═══ */}
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
                                                {/* r143 (Phase-4 W1، فجوة a11y من W1-SM §4.5): ظهور/اختفاء
                                                    زر «إعادة المحاولة» كان صامتًا لقارئات الشاشة — role=status
                                                    تعلن المنطقة عند تغيّرها (ظهور الزر = إعلان الفشل والإتاحة). */}
                                                <div role="status">
                                                        {statsFailed && (
                                                                <button type="button" className="ln-btn-ghost" onClick={retry}>
                                                                        <AnimatedRefreshCw className="size-3.5" aria-hidden="true" />
                                                                        إعادة المحاولة
                                                                </button>
                                                        )}
                                                </div>
                                        </div>
                                </section>

                                {/* ═══ الفصل ٠٢ — المنيو الحي: the REAL demo menu board ═══ */}
                                <MenuShowcaseSection />

                                {/* ═══ الفصل ٠٣ — من الطاولة إلى المطبخ: four numbered
                                    editorial frames over the real order journey ═══ */}
                                <JourneySection />

                                {/* ═══ الفصل ٠٤ — أجواء المكان: the editorial ambience
                                    band — the menu carries the restaurant's atmosphere
                                    as it is. ═══ */}
                                <AmbienceSection />

                                {/* ═══ الفصل ٠٥ — لصاحب المطعم: the asymmetric owner
                                    split with the honest course list ═══ */}
                                <RolesSection />

                                {/* ═══ الفصل ٠٦ — الختام: the espresso back-cover ═══ */}
                                <FinaleCta stats={stats} />

                                {/* ═══ الفصل ٠٧ — قبل أول طلب: the FAQ spread (merged
                                    into the finale chapter) ═══ */}
                                <LandingFaq />
                        </div>

                        <LandingFooter />

                        {/* paper-grain texture layer — last child, painted over the
                            whole world */}
                        <div className="ln-grain" aria-hidden="true" />
                </div>
        );
}
