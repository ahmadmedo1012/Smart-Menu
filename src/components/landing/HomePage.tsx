"use client";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import {
  ArrowLeft,
  BadgePercent,
  Store,
  Check,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import {
  BENEFITS,
  PARTNERS,
  STATS,
  STEPS,
  PRICING_PLANS,
  SHOWCASES,
  TESTIMONIALS,
} from "./landing-data";
import Reveal from "./Reveal";
import CountUp from "./CountUp";
import HeroVideo from "./HeroVideo";

export default function HomePage() {
  const [s0, s1, s2, s3] = SHOWCASES;
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* ═══ Hero ═══ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20 pb-16">
        {/* Background layers: gradient base + radial glow + dot grid */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-blue-50/10 to-background dark:via-blue-950/10" />
        <div className="absolute top-1/4 start-1/4 size-[50vw] rounded-full bg-gradient-to-br from-blue-500/10 to-blue-700/5 blur-[120px] dark:from-blue-500/15 dark:to-blue-700/5" />
        <div className="absolute bottom-0 end-0 size-[40vw] rounded-full bg-gradient-to-tr from-blue-400/8 to-blue-600/3 blur-[100px]" />

        {/* Hero grid */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center py-6">
          {/* Text side */}
          <div className="text-center lg:text-right order-last lg:order-first">
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary dark:text-blue-400 text-xs sm:text-sm mb-6 border border-primary/20 shadow-sm">
                <BadgePercent className="size-3.5 sm:size-4" />{" "}
                منصة إدارة منيو رقمية للمطاعم
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-5 leading-[0.92] tracking-tight text-balance">
                <span className="text-gradient-animated">حوّل مطعمك</span>
                <br />
                <span className="text-foreground">إلى منيو رقمي</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                استقبل طلبات الزبائن عبر واتساب بدون عناء. منيو رقمي احترافي
                لمطعمك يفتح على جميع الأجهزة.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="flex gap-3 justify-center lg:justify-start flex-wrap">
                <Link href="/subscribe">
                  <Button
                    variant="gradient"
                    size="lg"
                    className="text-base sm:text-lg px-8 h-14 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/35"
                  >
                    ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
                  </Button>
                </Link>
                <Link href={`/menu/${PARTNERS[0].slug}`}>
                  <Button
                    variant="gradient-outline"
                    size="lg"
                    className="text-base sm:text-lg px-8 h-14"
                  >
                    عرض منيو تجريبي
                  </Button>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <div className="flex items-center gap-4 mt-8 justify-center lg:justify-start">
                <div className="flex -space-x-1">
                  {["bg-blue-500", "bg-blue-600", "bg-blue-700", "bg-indigo-600", "bg-indigo-700"].map(
                    (c, i) => (
                      <div
                        key={i}
                        className={cn(
                          "size-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shadow-sm",
                          c
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    )
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="size-3.5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">5.0</span> +50
                    مطعماً يثقون بنا
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Phone side */}
          <Reveal delay={0.12} className="order-first lg:order-last">
            <HeroVideo />
          </Reveal>
        </div>
      </section>

      {/* ═══ Demo Preview ═══ */}
      <section className="py-24 bg-gradient-to-b from-blue-500/[0.04] to-background relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,var(--blue-500)/0.06,transparent_70%)]" />
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <Reveal delay={0}>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-gradient-animated">اكتشف كيف سيبدو منيو مطعمك</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-12">
              اختر مطعماً من القائمة وشاهد منيو تجريبي
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {PARTNERS.map((p, i) => (
                <Link
                  key={i}
                  href={`/menu/${p.slug}`}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border p-6 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-400 text-right card-premium",
                    i === 0
                      ? "border-blue-200/40 hover:border-blue-400/60"
                      : "border-border/30 hover:border-blue-300/50"
                  )}
                >
                  <div
                    className={cn(
                      "size-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-400 shadow-lg",
                      i === 0
                        ? "from-blue-500 to-blue-700"
                        : "from-blue-400 to-blue-600"
                    )}
                  >
                    <Store className="size-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {p.desc}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-primary font-medium">
                    <span>عرض المنيو</span>
                    <ArrowLeft className="size-3.5 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ Showcase — Bento ═══ */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent dark:from-blue-500/5" />
        <div className="relative max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span>لماذا الربط الذكي؟</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              كل ما يحتاجه مطعمك في منصة واحدة
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            <Reveal delay={0} className="sm:col-span-2">
              <div className="h-full rounded-2xl border border-border/30 bg-card/60 p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-400 flex flex-row items-center gap-7 shadow-lg shadow-blue-500/[0.02]">
                <div className="size-16 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-500/20">
                  <s0.icon className="size-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1.5">{s0.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {s0.desc}
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="h-full rounded-2xl border border-border/30 bg-card/50 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-400 text-center shadow-sm">
                <div className="size-14 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-600/10 flex items-center justify-center mx-auto mb-4">
                  <s1.icon className="size-7 text-primary" />
                </div>
                <h3 className="font-bold mb-1.5">{s1.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s1.desc}
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="h-full rounded-2xl border border-border/30 bg-gradient-to-br from-primary/[0.04] to-transparent p-6 flex flex-col justify-center shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <s2.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-bold">{s2.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s2.desc}
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.16} className="sm:col-span-2">
              <div className="h-full rounded-2xl border border-border/30 bg-card/60 p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-400 flex flex-row items-center gap-7 shadow-lg shadow-blue-500/[0.02]">
                <div className="size-16 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-500/20">
                  <s3.icon className="size-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1.5">{s3.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {s3.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ Stats ═══ */}
      <section className="py-20 bg-gradient-to-br from-blue-500/[0.06] to-primary/[0.03]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {STATS.map((s, i) => (
              <Reveal key={i} delay={i * 0.08} className="text-center">
                <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 mb-4 mx-auto shadow-inner">
                  <s.icon className="size-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                  <CountUp
                    value={s.value}
                    suffix={s.suffix}
                    decimals={s.decimals ?? 0}
                  />
                </div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Benefits ═══ */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span>مميزات متكاملة</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              كل الأدوات التي تحتاجها لإدارة مطعمك رقمياً
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-border/30 bg-card/60 p-6 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-400",
                    "shadow-sm hover:shadow-blue-500/[0.08]"
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl",
                      "bg-gradient-to-br from-blue-500/[0.03] to-transparent"
                    )}
                  />
                  <div className="relative z-10 flex items-start gap-4">
                    <div
                      className={cn(
                        "size-12 shrink-0 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                        b.gradient
                      )}
                    >
                      <b.icon className="size-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1.5">{b.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="py-24 bg-gradient-to-b from-muted/40 to-background">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span>ثلاث خطوات لانطلاق مطعمك الرقمي</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={i} delay={i * 0.15} className="text-center">
                  <div className="relative">
                    <div className="size-18 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/25">
                      <Icon className="size-8 text-white" />
                    </div>
                    {i < 2 && (
                      <div className="hidden md:block absolute top-9 left-[60%] w-[calc(80%)] h-px bg-gradient-to-r from-blue-400/50 to-transparent" />
                    )}
                    <div className="absolute -top-2 -end-2 size-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-md">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ Pricing ═══ */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span>خطط تناسب الجميع</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              ابدأ مجاناً وطور مطعمك مع نمو أعمالك
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {PRICING_PLANS.map((plan, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div
                  className={cn(
                    "relative flex flex-col rounded-3xl border p-8 transition-all duration-500 hover:scale-[1.03]",
                    plan.popular
                      ? "border-blue-400/50 bg-gradient-to-b from-blue-50/90 to-white shadow-2xl shadow-blue-500/20 dark:from-blue-950/20 dark:to-card dark:border-blue-500/30"
                      : "border-border/30 bg-card/50 hover:shadow-xl"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/30 ring-1 ring-blue-300/30">
                      الأكثر شعبية
                    </div>
                  )}
                  <div
                    className={cn(
                      "size-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                      plan.gradient
                    )}
                  >
                    <Star className="size-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">
                      د.ل / {plan.period}
                    </span>
                  </div>
                  <div className="space-y-2.5 mb-8 flex-1">
                    {plan.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2.5 text-sm">
                        <Check className="size-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/pricing">
                    <Button
                      className={cn(
                        "w-full h-12 rounded-xl text-base",
                        plan.popular &&
                          "bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 shadow-lg shadow-blue-500/25"
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

      {/* ═══ Partners ═══ */}
      <section className="py-24 bg-gradient-to-b from-blue-500/[0.03] to-background">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span>شركاؤنا في النجاح</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              انضم إلى عشرات المطاعم التي تستخدم الربط الذكي
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {PARTNERS.map((p, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <Link
                  href={`/menu/${p.slug}`}
                  className="block rounded-2xl border border-border/20 bg-background/50 p-10 text-center group hover:bg-gradient-to-br hover:from-blue-50/30 hover:to-background dark:hover:from-blue-950/10 hover:shadow-xl hover:-translate-y-2 transition-all duration-500"
                >
                  <div className="size-24 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:shadow-xl transition-all duration-500">
                    <Store className="size-11 text-primary/60 group-hover:text-primary transition-colors duration-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{p.name}</h3>
                  <p className="text-base text-muted-foreground mb-5">
                    {p.desc}
                  </p>
                  <div className="w-fit mx-auto flex items-center gap-2 px-5 py-2 rounded-full bg-primary/5 text-sm text-primary font-medium group-hover:bg-primary/10 transition-colors">
                    <span>عرض المنيو</span>
                    <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform duration-300" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Testimonials ═══ */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span>ماذا يقول عملاؤنا</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              كلمات من مطاعم ومقاهي تثق في الربط الذكي
            </p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="relative h-full rounded-2xl border border-border/30 bg-card/50 p-7 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-400 flex flex-col shadow-sm">
                  {/* Top accent bar */}
                  <div className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-gradient-to-r from-blue-400/50 to-transparent" />
                  {/* Quote icon */}
                  <div className="text-blue-500/20 text-4xl leading-none mb-2 font-serif">
                    &ldquo;
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-6 flex-1">
                    {t.content}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-border/20">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(Math.floor(t.rating))].map((_, j) => (
                        <Star
                          key={j}
                          className="size-3.5 fill-blue-400 text-blue-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.12] via-background to-primary/5" />
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 size-[50rem] rounded-full bg-blue-500/[0.08] blur-3xl" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <Reveal delay={0}>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-balance">
              <span>مستعد لانطلاق مطعمك الرقمي؟</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              انضم إلى عشرات المطاعم والمقاهي واستقبل الطلبات عبر واتساب بدون
              وسيط
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/subscribe">
                <Button
                  variant="gradient"
                  size="lg"
                  className="text-lg px-10 h-14 shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/35"
                >
                  ابدأ مجاناً الآن <ArrowLeft className="ms-2 size-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-10 h-14 border-2"
                >
                  عرض الخطط
                </Button>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="text-xs text-muted-foreground mt-5">
              مجاناً بدون بطاقة ائتمان • إلغاء في أي وقت
            </p>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
