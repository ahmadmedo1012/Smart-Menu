"use client";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PARTNERS, type PublicStats } from "./landing-data";
import PhoneMockup from "./PhoneMockup";

export default function HeroSection({ stats }: { stats: PublicStats | null }) {
  return (
    <section className="relative min-h-[95vh] flex items-center overflow-hidden pt-28 pb-20">
      {/* Deep ambient layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-gold-muted/5 to-background" />
      <div className="absolute top-0 start-0 size-[70vw] rounded-full bg-gradient-to-br from-gold/5 to-transparent blur-[140px]" />
      <div className="absolute bottom-0 end-0 size-[60vw] rounded-full bg-gradient-to-tr from-gold/3 to-transparent blur-[120px]" />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0 0 0 / 0.4) 0.5px, transparent 0.5px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-6 items-center">
          {/* Text column */}
          <div className="text-center lg:text-right order-last lg:order-first">
            {/* Kicker badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 text-[11px] font-semibold tracking-widest uppercase mb-6 text-gold border border-gold/20 rounded-full">
              <span className="size-1.5 rounded-full bg-gold animate-pulse" />
              منيو رقمي • طلب فوري
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[0.92] tracking-tight text-balance text-foreground">
              حوّل مطعمك
              <br />
              إلى{" "}
              <span className="text-gold underline decoration-gold/20 decoration-2 underline-offset-4">
                تجربة رقمية
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed mt-5">
              منيو رقمي احترافي مع طلب عبر واتساب. يعمل على كل الأجهزة بدون تطبيق.
              <span className="block text-sm text-muted-foreground/70 mt-2">
                زبائنك يطلبون من جوالهم مباشرة — الطلب يوصل لواتساب المطعم.
              </span>
            </p>

            {/* CTAs */}
            <div className="flex gap-3 justify-center lg:justify-start flex-wrap">
              <Link href="/subscribe">
                <Button
                  className="bg-gold text-gold-foreground hover:opacity-90 px-8 h-14 shadow-lg shadow-gold/20 hover:shadow-xl hover:shadow-gold/30"
                  size="lg"
                >
                  ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
                </Button>
              </Link>
              <Link href={`/menu/${PARTNERS[0].slug}`}>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 h-14 border-2 hover:border-gold/40 hover:text-foreground"
                >
                  عرض منيو تجريبي
                </Button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-8 flex items-center gap-2 justify-center lg:justify-start text-sm text-muted-foreground">
              <Star className="size-4 fill-gold text-gold" />
              <span>
                يثق بنا أكثر من{" "}
                <span className="font-bold text-foreground">
                  {stats?.totalRestaurants ?? "..."}
                </span>{" "}
                مطعماً ومقهى
              </span>
            </div>
          </div>

          {/* Phone column */}
          <div className="order-first lg:order-last flex justify-center lg:justify-end">
            <PhoneMockup tilt />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 start-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/40">
          <span className="text-[10px] font-medium tracking-widest uppercase">اسحب لأسفل</span>
          <div className="size-4 rounded-full border border-muted-foreground/30 flex items-center justify-center">
            <div className="size-1.5 rounded-full bg-gold/60 animate-breath" />
          </div>
        </div>
      </div>
    </section>
  );
}
