"use client";
import { useEffect, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { FloatingWhatsApp } from "@/components/shared/FloatingWhatsApp";
import { ScrollToTopBtn } from "@/components/shared/ScrollToTopBtn";
import { fetchPublicStats, type PublicStats } from "./landing-data";
import HeroSection from "./HeroSection";
import {
	ProblemSection,
	FeaturesGridSection,
	DigitalMenuSection,
	ExperienceSection,
	TestimonialsSection,
	FAQSection,
	ClientsSection,
	MidCTASection,
	ContactSection,
	CTASection,
} from "./CTASection";

export default function HomePage() {
	const [stats, setStats] = useState<PublicStats | null>(null);

	useEffect(() => {
		fetchPublicStats().then(setStats);
	}, []);

	return (
		<div className="flex flex-col min-h-screen">
			<Header />
			<HeroSection stats={stats} />
			<ProblemSection />
			<FeaturesGridSection />
			<DigitalMenuSection />
			<ExperienceSection />
			{stats && (
				<section className="relative py-20 bg-[#111013] text-center border-t border-white/5">
					<div className="max-w-[1220px] mx-auto px-4 grid md:grid-cols-3 gap-8">
						<div><div className="text-5xl font-medium text-white">{stats.totalRestaurants}+</div><div className="text-sm text-[#c0c0c0]">مطعم ومقهى</div></div>
						<div><div className="text-5xl font-medium text-white">{stats.totalUsers}+</div><div className="text-sm text-[#c0c0c0]">مستخدم نشط</div></div>
						<div><div className="text-5xl font-medium text-white">100%</div><div className="text-sm text-[#c0c0c0]">رضا العملاء</div></div>
					</div>
				</section>
			)}
			<TestimonialsSection />
			<FAQSection />
			<ClientsSection />
			<MidCTASection />
			<ContactSection />
			<CTASection />
			<Footer />
			<FloatingWhatsApp />
			<ScrollToTopBtn />
		</div>
	);
}
