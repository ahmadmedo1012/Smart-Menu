'use client';
import { useCallback, useEffect, useState } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import { Header } from '@/components/layout/Header';
import { fetchPublicStats, type PublicStats } from './landing-data';
import type { FeaturedRestaurant } from '@/lib/landing';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { ShowcaseSection } from './sections/ShowcaseSection';
import { FaqSection } from './sections/FaqSection';
import { FinalCTASection } from './sections/FinalCTASection';
import { StatsSection } from './sections/StatsSection';
import { FeaturedRestaurantsSection } from './sections/FeaturedRestaurantsSection';

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
        // Bumped by the retry buttons to re-run the fetch effect without a page reload.
        const [retryKey, setRetryKey] = useState(0);
        // True only when a request actually failed (never on AbortError) — drives
        // the retry affordances under each section's skeleton/loading state.
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
                // entirely; the retry button resets state to null and re-runs this
                // effect (the fetches below are the fallback path).
                if (stats === null) {
                        fetchPublicStats()
                                .then((s) => {
                                        if (!s || typeof s.totalRestaurants !== 'number') throw new Error('bad stats payload');
                                        setStats(s);
                                })
                                .catch((error) => {
                                        if (error instanceof DOMException && error.name === 'AbortError') return;
                                        // Keep section in skeleton (null) instead of silently vanishing —
                                        // a transient failure shouldn't wipe the stats block for the visit.
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
                                        // null keeps the loading skeleton visible (with retry affordance);
                                        // [] would blank the section silently.
                                        setFeatured(null);
                                        setFeaturedFailed(true);
                                });
                }
                return () => controller.abort();
        }, [retryKey, stats, featured]);

        return (
                <div className="flex flex-col min-h-screen overflow-x-clip">
                        <Header />
                        <HeroSection totalRestaurants={stats?.totalRestaurants} />
                        <FeaturesSection />
                        <ShowcaseSection />
                        {stats ? (
                                <StatsSection stats={stats} />
                        ) : (
                                statsFailed && (
                                        <div className="flex justify-center">
                                                <Button variant="ghost" size="sm" onClick={retry}>
                                                        <AnimatedRefreshCw className="size-3.5" aria-hidden="true" />
                                                        إعادة المحاولة
                                                </Button>
                                        </div>
                                )
                        )}
                        <FeaturedRestaurantsSection
                                restaurants={featured}
                                onRetry={featuredFailed ? retry : undefined}
                        />
                        <HowItWorksSection />
                        {/* r121-P3 (backlog #35): قسم «تجارب المطاعم» حُذف كاملاً —
                            كان يعرض شهادات مُختلقة بأسماء علامات حقيقية (Telepizza،
                            SOHO، Kubaba…) بلا مصدر بيانات، وصف شريط ثقة يتضمن
                            «ضمان استرداد» غير الموجود في أي سياسة (سياسة الصدق
                            r82 + خطر قانوني). الإثبات الاجتماعي الصادق يحمله
                            StatsSection (أرقام حية) و FeaturedRestaurantsSection
                            (منيو مطاعم حقيقية من قاعدة البيانات) أعلاه مباشرة —
                            فلا فراغ في الرحلة. */}
                        <FaqSection />
                        <FinalCTASection totalRestaurants={stats?.totalRestaurants} />
                        <Footer />
                </div>
        );
}
