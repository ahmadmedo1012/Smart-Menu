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
import FinalCTASection from "./sections/FinalCTASection"
import StatsSection from "./sections/StatsSection"
import FeaturedRestaurantsSection from "./sections/FeaturedRestaurantsSection"

type Props = {
    stats?: PublicStats | null;
    featuredRestaurants?: FeaturedRestaurant[];
};

export default function HomePage({ stats: serverStats, featuredRestaurants }: Props) {
    const [stats, setStats] = useState<PublicStats | null>(serverStats ?? null)

    useEffect(() => {
        if (!serverStats) {
            fetchPublicStats().then(setStats).catch(() => console.error("Failed to load public stats"))
        }
    }, [serverStats])

    return (
        <div className="flex flex-col min-h-screen overflow-x-hidden">
            <Header />
            <HeroSection />
            <FeaturesSection />
            <ShowcaseSection />
            {(stats || serverStats) && <StatsSection stats={stats ?? serverStats!} />}
            <FeaturedRestaurantsSection restaurants={featuredRestaurants ?? []} />
            <HowItWorksSection />
            <ClientsSection />
            <FinalCTASection />
            <Footer />
        </div>
    )
}
