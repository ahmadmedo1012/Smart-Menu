"use client"
import { useEffect, useState } from "react"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { fetchPublicStats, type PublicStats } from "./landing-data"
import type { FeaturedRestaurant } from "@/lib/landing"
import HeroSection from "./HeroSection"
import FeaturesSection from "./sections/FeaturesSection"
import HowItWorksSection from "./sections/HowItWorksSection"
import ClientsSection from "./sections/ClientsSection"
import ShowcaseSection from "./sections/ShowcaseSection"
import FaqSection from "./sections/FaqSection"
import FinalCTASection from "./sections/FinalCTASection"
import StatsSection from "./sections/StatsSection"
import FeaturedRestaurantsSection from "./sections/FeaturedRestaurantsSection"

export default function HomePage() {
    const [stats, setStats] = useState<PublicStats | null>(null)
    const [featured, setFeatured] = useState<FeaturedRestaurant[] | null>(null)

    useEffect(() => {
        fetchPublicStats().then(setStats).catch(() => {});
        fetch("/api/public/featured")
            .then(r => r.json())
            .then(d => setFeatured(d.data ?? []))
            .catch(() => setFeatured([]))
    }, [])

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
    )
}
