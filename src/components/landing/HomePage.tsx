"use client";
import Link from "next/link";
import { useState } from "react";
import { Footer } from "@/components/layout/Footer";
import {
  ArrowLeft,
  Store,
  Check,
  Star,
  Smartphone,
  MessageCircle,
  LayoutDashboard,
  Gift,
  QrCode,
  BarChart3,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { BENEFITS, PARTNERS, STATS, STEPS, PRICING_PLANS, TESTIMONIALS } from "./landing-data";
import Reveal from "./Reveal";
import CountUp from "./CountUp";
import PhoneMockup from "./PhoneMockup";

export default function HomePage() {
  const [activePartner, setActivePartner] = useState(0);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* ═══ Hero ═══ */}
      <section className="relative min-h-[95vh] flex items-center overflow-hidden pt-24 pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-warm-muted/30 to-background" />
        <div className="absolute top-1/4 start-1/4 size-[60vw] rounded-full bg-gradient-to-br from-warm/8 to-warm/3 blur-[120px]" />
        <div className="absolute bottom-0 end-0 size-[45vw] rounded-full bg-gradient-to-tr from-warm/5 to-warm/2 blur-[100px]" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 grid lg:grid-cols-[1fr_1.15fr] gap-10 items-center py-4">
          {/* Text — RTL visual order */}
          <div className="text-center lg:text-right order-last lg:order-first">
            <Reveal animation="animate-quick-fade" delay={0}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[0.92] tracking-tight text-balance text-foreground">
                حوّل مطعمك إلى تجربة رقمية
              </h1>
            </Reveal>
            <Reveal animation="animate-quick-fade" delay={0.08}>
              <p className="text-base sm:text-lg text-muted-foreground mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
                منيو رقمي احترافي مع طلب عبر واتساب. يعمل على كل الأجهزة بدون تطبيق.
              </p>
            </Reveal>
            <Reveal animation="animate-quick-fade" delay={0.16}>
              <div className="flex gap-3 justify-center lg:justify-start flex-wrap">
                <Link href="/subscribe">
                  <Button className="bg-warm text-warm-foreground hover:opacity-90 px-8 h-14 shadow-lg" size="lg">
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
            <Reveal animation="animate-quick-fade" delay={0.24}>
              <div className="mt-8 flex items-center gap-2 justify-center lg:justify-start text-sm text-muted-foreground">
                <Star className="size-4 fill-warm text-warm" />
                <span>يثق بنا أكثر من <span className="font-bold text-foreground">٥٠</span> مطعماً</span>
              </div>
            </Reveal>
          </div>

          {/* Phone — centerpiece */}
          <Reveal animation="animate-quick-fade" delay={0.1} className="order-first lg:order-last">
            <PhoneMockup tilt />
          </Reveal>
        </div>
      </section>

      {/* ═══ Stats ═══ */}
      <section className="py-20 bg-gradient-to-br from-warm-muted/80 to-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <Reveal key={i} animation="animate-reveal" delay={i * 0.1}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center size-12 rounded-xl bg-warm-muted mb-3 mx-auto">
                    <s.icon className="size-5 text-warm" />
                  </div>
                  <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                    <CountUp value={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} />
                  </div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section className="py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-warm-muted/40 to-transparent dark:from-warm-muted/20" />
        <div className="relative max-w-6xl mx-auto px-4">
          <Reveal animation="animate-feature-in" className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">لماذا الربط الذكي؟</h2>
            <p className="text-lg text-muted-foreground">كل ما يحتاجه مطعمك في منصة واحدة</p>
          </Reveal>

          {/* Featured — 2-col, detailed cards */}
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            {BENEFITS.slice(0, 4).map((f, i) => (
              <Reveal key={i} animation="animate-feature-in" delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-border/20 bg-card/50 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-warm-muted/60">
                  <div className="flex items-start gap-5">
                    <div className="size-12 shrink-0 rounded-xl bg-warm-muted flex items-center justify-center">
                      <f.icon className="size-6 text-warm" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-1.5">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Compact — small cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.slice(4).map((f, i) => (
              <Reveal key={i} animation="animate-feature-in" delay={0.32 + i * 0.08}>
                <div className="h-full rounded-xl border border-border/15 bg-card/30 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-sm hover:border-warm-muted/50">
                  <div className="size-9 rounded-lg bg-warm-muted flex items-center justify-center mb-3">
                    <f.icon className="size-4.5 text-warm" />
                  </div>
                  <h3 className="text-sm font-bold mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal animation="animate-feature-in" className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">انطلق في ثلاث خطوات</h2>
            <p className="text-lg text-muted-foreground">من التسجيل إلى أول طلب في دقائق</p>
          </Reveal>

          <div className="relative max-w-4xl mx-auto">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 bg-gradient-to-r from-warm/60 via-warm/30 to-warm/60" />

            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step, i) => (
                <Reveal key={i} animation="animate-feature-in" delay={i * 0.2}>
                  <div className="text-center">
                    <div className="relative mb-5 inline-flex">
                      <div className="size-16 rounded-2xl bg-warm flex items-center justify-center mx-auto shadow-xl shadow-warm/20">
                        <step.icon className="size-7 text-warm-foreground" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Partners ═══ */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal animation="animate-quick-fade" className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">جرب منيو تجريبي</h2>
            <p className="text-lg text-muted-foreground">اختر مطعماً وشاهد كيف يعمل</p>
          </Reveal>
          <Reveal animation="animate-quick-fade">
            <div className="flex gap-2 justify-center mb-10 flex-wrap">
              {PARTNERS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePartner(i)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                    activePartner === i
                      ? "bg-warm text-warm-foreground shadow-lg shadow-warm/25"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-border/30",
                  )}
                >
                  <Store className="size-3.5 inline-block me-1.5 -mt-0.5" />
                  {p.name}
                </button>
              ))}
            </div>
          </Reveal>
          <Reveal key={activePartner} animation="animate-quick-fade">
            <Link
              href={`/menu/${PARTNERS[activePartner].slug}`}
              className="block max-w-md mx-auto rounded-2xl border border-border/20 bg-card/40 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-warm-muted/60 hover:shadow-lg text-center"
            >
              <div className="size-14 rounded-2xl bg-warm flex items-center justify-center mx-auto mb-4 shadow-lg shadow-warm/20">
                <Store className="size-7 text-warm-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-1">{PARTNERS[activePartner].name}</h3>
              <p className="text-sm text-muted-foreground mb-5">{PARTNERS[activePartner].desc}</p>
              <div className="inline-flex items-center gap-2 text-sm text-warm-foreground font-medium bg-warm px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity">
                <span>عرض المنيو التجريبي</span>
                <ArrowLeft className="size-4" />
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ═══ Testimonials ═══ */}
      <section className="py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal animation="animate-reveal" className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">من مطاعمكم</h2>
            <p className="text-lg text-muted-foreground">كلمات من أصحاب المطاعم والمقاهي</p>
          </Reveal>

          {/* Featured testimonial */}
          <Reveal animation="animate-reveal" delay={0.08} className="mb-5">
            <div className="rounded-2xl border border-border/20 bg-card/50 p-8 md:p-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="size-14 rounded-full bg-warm-muted flex items-center justify-center text-warm text-lg font-bold shrink-0 shadow-lg">
                  {TESTIMONIALS[0].name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-base text-foreground/80 leading-relaxed mb-5">
                    {TESTIMONIALS[0].content}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{TESTIMONIALS[0].name}</p>
                      <p className="text-sm text-muted-foreground">{TESTIMONIALS[0].role}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(Math.floor(TESTIMONIALS[0].rating))].map((_, j) => (
                        <Star key={j} className="size-4 fill-warm text-warm" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Grid testimonials */}
          <div className="grid md:grid-cols-2 gap-5">
            {TESTIMONIALS.slice(1).map((t, i) => (
              <Reveal key={i} animation="animate-reveal" delay={0.08 + i * 0.12}>
                <div className="rounded-2xl border border-border/20 bg-card/40 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <p className="text-sm text-foreground/80 leading-relaxed mb-5 flex-1">
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-border/15">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-warm-muted flex items-center justify-center text-warm text-sm font-bold shrink-0">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(Math.floor(t.rating))].map((_, j) => (
                        <Star key={j} className="size-3.5 fill-warm text-warm" />
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Pricing ═══ */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal animation="animate-scale-fade" className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">خطط تناسب الجميع</h2>
            <p className="text-lg text-muted-foreground">ابدأ مجاناً وطور مطعمك تدريجياً</p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {PRICING_PLANS.map((plan, i) => (
              <Reveal key={i} animation="animate-scale-fade" delay={i * 0.15}>
                <div
                  className={cn(
                    "relative flex flex-col rounded-3xl border p-8 transition-all duration-500",
                    plan.popular
                      ? "border-warm/40 bg-card shadow-2xl shadow-warm/15 dark:border-warm/30"
                      : "border-border/20 bg-card/40 hover:shadow-xl",
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-warm text-warm-foreground text-[11px] font-semibold shadow-lg">
                      الأكثر شعبية
                    </div>
                  )}
                  <div className="size-10 rounded-xl bg-warm-muted flex items-center justify-center mb-4">
                    <Store className="size-5 text-warm" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">د.ل / {plan.period}</span>
                  </div>
                  <div className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2.5 text-sm">
                        <Check className="size-4 text-warm shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/pricing">
                    <Button
                      className={cn(
                        "w-full h-12 rounded-xl text-base",
                        plan.popular && "bg-warm text-warm-foreground hover:opacity-90 shadow-lg shadow-warm/25",
                      )}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal animation="animate-scale-fade">
            <div className="max-w-4xl mx-auto rounded-3xl border bg-card p-12 text-center shadow-sm">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-balance">مستعد لانطلاق مطعمك الرقمي؟</h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
                انضم إلى عشرات المطاعم والمقاهي. استقبل الطلبات عبر واتساب بدون وسيط.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link href="/subscribe">
                  <Button className="bg-warm text-warm-foreground hover:opacity-90 px-10 h-14 shadow-lg" size="lg">
                    ابدأ مجاناً الآن <ArrowLeft className="ms-2 size-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="lg" className="px-10 h-14 border-2">
                    عرض الخطط
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-5">مجاناً بدون بطاقة ائتمان • إلغاء في أي وقت</p>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
