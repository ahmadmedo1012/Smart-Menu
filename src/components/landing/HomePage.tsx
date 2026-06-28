"use client"
import { useEffect, useState } from "react"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { FloatingWhatsApp } from "@/components/shared/FloatingWhatsApp"
import { fetchPublicStats, type PublicStats } from "./landing-data"
import HeroSection from "./HeroSection"
import FeaturesSection from "./sections/FeaturesSection"
import HowItWorksSection from "./sections/HowItWorksSection"
import TestimonialsSection from "./sections/TestimonialsSection"
import ClientsSection from "./sections/ClientsSection"
import ShowcaseSection from "./sections/ShowcaseSection"
import FinalCTASection from "./sections/FinalCTASection"

export default function HomePage() {
	const [stats, setStats] = useState<PublicStats | null>(null)

	useEffect(() => {
		fetchPublicStats().then(setStats)
	}, [])

	return (
		<div className="flex flex-col min-h-screen">
			<Header />
			<HeroSection />
			<FeaturesSection />
			<ShowcaseSection />
			{stats && (
				<section className="relative py-14 sm:py-16 text-center overflow-hidden">
					<div className="absolute -top-20 left-1/2 -translate-x-1/2 size-72 rounded-full bg-orange/5 blur-[100px] pointer-events-none" />
					<div className="relative z-10 max-w-[1220px] mx-auto px-4">
						<div className="grid sm:grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
							<div className="group rounded-sm bg-card border border-border/50 p-6 sm:p-8 shadow-sm hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 hover:-translate-y-1 transition-all duration-300">
								<div className="text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-[520] text-orange leading-none mb-2" dir="ltr">{stats.totalRestaurants.toLocaleString()}+</div>
								<div className="text-xs sm:text-sm font-medium text-muted-foreground/80">مطعم ومقهى</div>
								<div className="mt-3 text-[0.6rem] text-muted-foreground/40">ينضمون إلينا شهرياً</div>
							</div>
							<div className="group rounded-sm bg-card border border-border/50 p-6 sm:p-8 shadow-sm hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 hover:-translate-y-1 transition-all duration-300">
								<div className="text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-[520] text-orange leading-none mb-2" dir="ltr">{(stats.totalRestaurants * 3).toLocaleString()}k+</div>
								<div className="text-xs sm:text-sm font-medium text-muted-foreground/80">طلب مُدار</div>
								<div className="mt-3 text-[0.6rem] text-muted-foreground/40">شهرياً عبر المنصة</div>
							</div>
							<div className="group rounded-sm bg-card border border-border/50 p-6 sm:p-8 shadow-sm hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 hover:-translate-y-1 transition-all duration-300">
								<div className="text-[2.25rem] sm:text-[2.75rem] md:text-[3.25rem] font-[520] text-orange leading-none mb-2">99%</div>
								<div className="text-xs sm:text-sm font-medium text-muted-foreground/80">رضا العملاء</div>
								<div className="mt-3 text-[0.6rem] text-muted-foreground/40">بناءً على ١٢٠٠+ تقييم</div>
							</div>
						</div>
					</div>
				</section>
			)}
			<HowItWorksSection />
				<TestimonialsSection/>
			<ClientsSection />
			<FinalCTASection />
			<Footer />
			<FloatingWhatsApp />
		</div>
	)
}
