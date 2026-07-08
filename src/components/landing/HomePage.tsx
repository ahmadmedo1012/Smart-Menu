"use client"
import { useEffect, useState } from "react"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { fetchPublicStats, type PublicStats } from "./landing-data"
import HeroSection from "./HeroSection"
import FeaturesSection from "./sections/FeaturesSection"
import HowItWorksSection from "./sections/HowItWorksSection"
import ClientsSection from "./sections/ClientsSection"
import ShowcaseSection from "./sections/ShowcaseSection"
import FinalCTASection from "./sections/FinalCTASection"
import StatsSection from "./sections/StatsSection"

export default function HomePage() {
	const [stats, setStats] = useState<PublicStats | null>(null)

	useEffect(() => {
		fetchPublicStats().then(setStats).catch(() => setStats({ totalRestaurants: 500, totalUsers: 5 }))
	}, [])

	return (
		<div className="flex flex-col min-h-screen overflow-x-hidden">
			<Header />
			<HeroSection />
			<FeaturesSection />
			<ShowcaseSection />
			{stats && <StatsSection stats={stats} />}
			<HowItWorksSection />
			<ClientsSection />
			<FinalCTASection />
			<Footer />
		</div>
	)
}
