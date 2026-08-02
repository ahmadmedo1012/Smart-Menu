'use client';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/layout/Footer';
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
			});
		return () => controller.abort();
	}, []);

	return (
		<div className="flex flex-col min-h-screen overflow-x-hidden">
			<Header />
			<HeroSection />
			<FeaturesSection />
			<ShowcaseSection />
			{stats && <StatsSection stats={stats} />}
			<FeaturedRestaurantsSection restaurants={featured} />
			<HowItWorksSection />
			<ClientsSection />
			<FaqSection />
			<FinalCTASection />
			<Footer />
		</div>
	);
}
