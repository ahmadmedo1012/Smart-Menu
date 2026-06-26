"use client";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PARTNERS, type PublicStats } from "./landing-data";
import Reveal from "./Reveal";
import PhoneMockup from "./PhoneMockup";

export default function HeroSection({ stats }: { stats: PublicStats | null }) {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-24 pb-20">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-gold-muted/20 to-background" />
      <div className="absolute top-1/4 start-1/4 size-[50vw] rounded-full bg-gradient-to-br from-gold/8 to-gold/3 blur-[120px]" />
      <div className="absolute bottom-0 end-0 size-[40vw] rounded-full bg-gradient-to-tr from-gold/5 to-gold/2 blur-[100px]" />

      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, oklch(0 0 0 / 0.5) 0.5px, transparent 0.5px)", backgroundSize: "24px 24px" }} />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center py-4">
        <div className="text-center lg:text-right order-last lg:order-first">
          <Reveal animation="animate-fade-in" delay={0}>
            <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-6 text-gold border border-gold/20 rounded-full">
              منيو رقمي • طلب فوري
            </span>
          </Reveal>
          <Reveal animation="animate-fade-in" delay={0.06}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[0.92] tracking-tight text-balance text-foreground">
              حوّل مطعمك<br />إلى تجربة رقمية
            </h1>
          </Reveal>
          <Reveal animation="animate-fade-in" delay={0.12}>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed mt-4">
              منيو رقمي احترافي مع طلب عبر واتساب. يعمل على كل الأجهزة بدون تطبيق.
            </p>
          </Reveal>
          <Reveal animation="animate-fade-in" delay={0.18}>
            <div className="flex gap-3 justify-center lg:justify-start flex-wrap">
              <Link href="/subscribe">
                <Button className="bg-gold text-gold-foreground hover:opacity-90 px-8 h-14 shadow-lg shadow-gold/20" size="lg">
                  ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
                </Button>
              </Link>
              <Link href={`/menu/${PARTNERS[0].slug}`}>
                <Button variant="outline" size="lg" className="px-8 h-14 border-2">
                  عرض منيو تجريبي
                </Button>
              </Link>
            </div>
          </Reveal>
          <Reveal animation="animate-fade-in" delay={0.24}>
            <div className="mt-8 flex items-center gap-2 justify-center lg:justify-start text-sm text-muted-foreground">
              <Star className="size-4 fill-gold text-gold" />
              <span>يثق بنا أكثر من <span className="font-bold text-foreground">{stats?.totalRestaurants ?? "..."}</span> مطعماً ومقهى</span>
            </div>
          </Reveal>
        </div>

        <Reveal animation="animate-fade-in" delay={0.1} className="order-first lg:order-last">
          <PhoneMockup tilt />
        </Reveal>
      </div>
    </section>
  );
}
