"use client";
import { useEffect, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { fetchPublicStats, type PublicStats } from "./landing-data";
import HeroSection from "./HeroSection";
import StatsSection from "./StatsSection";
import FeaturesSection from "./FeaturesSection";
import HowItWorksSection from "./HowItWorksSection";
import PartnersSection from "./PartnersSection";
import TestimonialsSection from "./TestimonialsSection";
import PricingSection from "./PricingSection";
import CTASection from "./CTASection";

export default function HomePage() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetchPublicStats().then(setStats);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <HeroSection stats={stats} />
      {stats && <StatsSection stats={stats} />}
      <FeaturesSection />
      <HowItWorksSection />
      <PartnersSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
