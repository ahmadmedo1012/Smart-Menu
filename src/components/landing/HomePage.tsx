"use client";
import { useEffect, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { fetchPublicStats, type PublicStats } from "./landing-data";
import HeroSection from "./HeroSection";
import { PhoneShowcaseSection, StatsSection, HowItWorksSection, DisplayCards, CTASection } from "./CTASection";

export default function HomePage() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetchPublicStats().then(setStats);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <HeroSection stats={stats} />
      <PhoneShowcaseSection />
      {stats && <StatsSection stats={stats} />}
      <HowItWorksSection />
      <DisplayCards />
      <CTASection />
      <Footer />
    </div>
  );
}
