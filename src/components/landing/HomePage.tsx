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
import { ClientsSection } from './sections/ClientsSection';
import { ShowcaseSection } from './sections/ShowcaseSection';
import { FaqSection } from './sections/FaqSection';
import { FinalCTASection } from './sections/FinalCTASection';
import { StatsSection } from './sections/StatsSection';
import { FeaturedRestaurantsSection } from './sections/FeaturedRestaurantsSection';

export function HomePage() {
	const [stats, setStats] = useState<PublicStats | null>(null);
	const [featured, setFeatured] = useState<FeaturedRestaurant[] | null>(null);
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
		return () => controller.abort();
	}, [retryKey]);

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
			<ClientsSection />
			<FaqSection />
			<FinalCTASection totalRestaurants={stats?.totalRestaurants} />
			<Footer />
		</div>
	);
}
