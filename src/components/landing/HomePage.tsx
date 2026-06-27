"use client"
import { useEffect, useState } from "react"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { FloatingWhatsApp } from "@/components/shared/FloatingWhatsApp"
import { ScrollToTopBtn } from "@/components/shared/ScrollToTopBtn"
import { fetchPublicStats, type PublicStats } from "./landing-data"
import HeroSection from "./HeroSection"
import FeaturesSection from "./sections/FeaturesSection"
import TestimonialsSection from "./sections/TestimonialsSection"
import FAQSection from "./sections/FAQSection"
import ClientsSection from "./sections/ClientsSection"
import ContactSection from "./sections/ContactSection"
import FinalCTASection from "./sections/FinalCTASection"

export default function HomePage() {
	const [stats, setStats] = useState<PublicStats | null>(null)

	useEffect(() => {
		fetchPublicStats().then(setStats)
	}, [])

	return (
		<div className="flex flex-col min-h-screen">
			<Header />
			<HeroSection stats={stats} />
			<FeaturesSection />
			{stats && (
				<section className="relative py-20 border-t border-border/50 text-center">
					<div className="max-w-[1220px] mx-auto px-4 grid sm:grid-cols-1 md:grid-cols-3 gap-8">
						<div>
							<div className="text-5xl font-medium">{stats.totalRestaurants}+</div>
							<div className="text-sm text-muted-foreground">مطعم ومقهى</div>
						</div>
						<div>
							<div className="text-5xl font-medium">{stats.totalUsers}+</div>
							<div className="text-sm text-muted-foreground">مستخدم نشط</div>
						</div>
						<div>
							<div className="text-5xl font-medium">100%</div>
							<div className="text-sm text-muted-foreground">رضا العملاء</div>
						</div>
					</div>
				</section>
			)}
			<TestimonialsSection />
			<FAQSection />
			<ClientsSection />
			<ContactSection />
			<FinalCTASection />
			<Footer />
			<FloatingWhatsApp />
			<ScrollToTopBtn />
		</div>
	)
}
