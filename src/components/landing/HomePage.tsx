"use client"
import { useEffect, useState } from "react"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { FloatingWhatsApp } from "@/components/shared/FloatingWhatsApp"
import { fetchPublicStats, type PublicStats } from "./landing-data"
import HeroSection from "./HeroSection"
import FeaturesSection from "./sections/FeaturesSection"
import TestimonialsSection from "./sections/TestimonialsSection"
import ClientsSection from "./sections/ClientsSection"
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
			{stats && (
				<section className="relative py-20 text-center">
					<div className="max-w-[1220px] mx-auto px-4 grid sm:grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
						<div className="gpu-layer rounded-sm bg-card border border-border/50 p-8 shadow-sm hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 hover:-translate-y-1 transition-all duration-300 text-right">
							<div className="text-4xl md:text-5xl font-medium text-orange mb-1">{stats.totalRestaurants}+</div>
							<div className="text-sm text-muted-foreground">مطعم ومقهى</div>
						</div>
						<div className="gpu-layer rounded-sm bg-card border border-border/50 p-8 shadow-sm hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 hover:-translate-y-1 transition-all duration-300 text-right">
							<div className="text-4xl md:text-5xl font-medium text-orange mb-1">{stats.totalUsers}+</div>
							<div className="text-sm text-muted-foreground">مستخدم نشط</div>
						</div>
						<div className="gpu-layer rounded-sm bg-card border border-border/50 p-8 shadow-sm hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 hover:-translate-y-1 transition-all duration-300 text-right">
							<div className="text-4xl md:text-5xl font-medium text-orange mb-1">100%</div>
							<div className="text-sm text-muted-foreground">رضا العملاء</div>
						</div>
					</div>
				</section>
			)}
			<TestimonialsSection />
			<ClientsSection />
			<FinalCTASection />
			<Footer />
			<FloatingWhatsApp />
		</div>
	)
}
