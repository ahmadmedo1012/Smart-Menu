"use client";
import Link from "next/link";
import { useState } from "react";
import { Footer } from "@/components/layout/Footer";
import {
  ArrowLeft,
  BadgePercent,
  Store,
  Check,
  Star,
  Smartphone,
  MessageCircle,
  LayoutDashboard,
  Monitor,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { BENEFITS, PARTNERS, STATS, STEPS, PRICING_PLANS, TESTIMONIALS } from "./landing-data";
import Reveal from "./Reveal";
import CountUp from "./CountUp";
import PhoneMockup from "./PhoneMockup";

/** Benefit card — 3 visual treatments for rhythm */
function BenefitCard({
  icon: Icon,
  title,
  desc,
  gradient,
  idx,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  gradient: string;
  idx: number;
}) {
  const isWide = idx < 2;
  const isCentered = idx >= 2 && idx < 4;

  if (isWide) {
    return (
      <Reveal delay={idx * 0.06}>
        <div className="rounded-2xl border border-border/30 bg-card/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-blue-300/40 dark:hover:border-blue-700/30 h-full">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "size-12 shrink-0 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                gradient,
              )}
            >
              <Icon className="size-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        </div>
      </Reveal>
    );
  }

  if (isCentered) {
    return (
      <Reveal delay={idx * 0.06 + 0.12}>
        <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/15 dark:to-card/30 p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full">
          <div
            className={cn(
              "size-14 rounded-full bg-gradient-to-br flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/10",
              gradient,
            )}
          >
            <Icon className="size-7 text-white" />
          </div>
          <h3 className="font-bold mb-1.5">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </Reveal>
    );
  }

  return (
    <Reveal delay={idx * 0.06 + 0.24}>
      <div className="rounded-2xl border border-border/30 bg-card/30 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full">
        <div className="flex items-start gap-4">
          <div className="size-12 shrink-0 rounded-2xl border-2 border-amber-200 dark:border-amber-700/50 flex items-center justify-center">
            <Icon className="size-6 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function HomePage() {
  const [activePartner, setActivePartner] = useState(0);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* ═══ Hero ═══ */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20 pb-16">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-blue-50/10 to-background dark:via-blue-950/10" />
        <div className="absolute top-1/4 start-1/4 size-[50vw] rounded-full bg-gradient-to-br from-blue-500/10 to-blue-700/5 blur-[120px] dark:from-blue-500/15 dark:to-blue-700/5" />
        <div className="absolute bottom-0 end-0 size-[40vw] rounded-full bg-gradient-to-tr from-blue-400/8 to-blue-600/3 blur-[100px]" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center py-6">
          {/* Left: text content (RTL so this is visually right) */}
          <div className="text-center lg:text-right order-last lg:order-first">
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs sm:text-sm mb-6 border border-blue-200/50 dark:border-blue-800/30 shadow-sm">
                <BadgePercent className="size-3.5 sm:size-4" />
                منصة إدارة منيو رقمية للمطاعم
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[0.9] tracking-tight text-balance min-w-0">
                <span className="text-blue-600 dark:text-blue-400">حوّل مطعمك</span>
                <br />
                إلى منيو رقمي
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                استقبل طلبات الزبائن عبر واتساب بدون عناء. منيو رقمي احترافي لمطعمك يفتح على جميع الأجهزة.
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
                  <Button variant="gradient-outline" size="lg" className="text-base sm:text-lg px-8 h-14">
                    عرض منيو تجريبي
                  </Button>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <div className="flex items-center gap-4 mt-8 justify-center lg:justify-start">
                <div className="flex -space-x-1">
                  {["bg-blue-500", "bg-blue-600", "bg-indigo-500", "bg-blue-700", "bg-indigo-600"].map(
                    (c, i) => (
                      <div
                        key={i}
                        className={cn(
                          "size-8 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shadow-sm",
                          c,
                        )}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    ),
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">5.0</span> +50 مطعماً يثقون بنا
                  </span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Right: tilted premium phone (LTR order) */}
          <Reveal delay={0.12} className="order-first lg:order-last">
            <PhoneMockup tilt />
          </Reveal>
        </div>
      </section>

      {/* ═══ Stats ═══ */}
      <section className="py-20 bg-gradient-to-br from-blue-500/[0.06] to-primary/[0.03]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {STATS.map((s, i) => (
              <Reveal key={i} delay={i * 0.08} className="text-center">
                <div
                  className={cn(
                    "inline-flex items-center justify-center size-14 rounded-2xl mb-4 mx-auto shadow-inner",
                    i === 0
                      ? "bg-blue-50 dark:bg-blue-950/30"
                      : i === 1
                        ? "bg-indigo-50 dark:bg-indigo-950/30"
                        : i === 2
                          ? "bg-sky-50 dark:bg-sky-950/30"
                          : "bg-primary/5",
                  )}
                >
                  <s.icon className="size-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                  <CountUp value={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} />
                </div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Features (showcase) ═══ */}
      <section className="py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/[0.03] to-transparent dark:from-blue-500/5" />
        <div className="relative max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">لماذا الربط الذكي؟</h2>
            <p className="text-lg text-muted-foreground">كل ما يحتاجه مطعمك في منصة واحدة</p>
          </Reveal>

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Wide card 1 */}
            <Reveal className="sm:col-span-2">
              <div className="rounded-2xl border border-blue-200/20 dark:border-blue-800/20 bg-gradient-to-br from-blue-50/60 to-background dark:from-blue-950/20 dark:to-card/50 p-8 flex flex-row items-center gap-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="size-16 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-500/20">
                  <Smartphone className="size-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1.5">منيو رقمي أنيق</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    قائمة طعام بتصميم جذاب تعرض أصنافك بأفضل صورة
                  </p>
                </div>
              </div>
            </Reveal>

            {/* 2-column card 1 */}
            <Reveal delay={0.08}>
              <div className="rounded-2xl border border-border/30 bg-card/50 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-md h-full">
                <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="size-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold mb-1.5">طلبات لحظية</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  الطلبات تصل مباشرة لواتساب المطعم مع تفاصيل كاملة
                </p>
              </div>
            </Reveal>

            {/* 2-column card 2 */}
            <Reveal delay={0.12}>
              <div className="rounded-2xl border border-border/20 bg-gradient-to-br from-blue-50/40 to-background dark:from-blue-950/15 dark:to-card/30 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md h-full">
                <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                  <LayoutDashboard className="size-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-bold mb-1.5">لوحة تحكم متكاملة</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  إدارة المطاعم والمنيو والطلبات والإحصائيات من مكان واحد
                </p>
              </div>
            </Reveal>

            {/* Wide card 2 */}
            <Reveal delay={0.16} className="sm:col-span-2">
              <div className="rounded-2xl border border-blue-200/20 dark:border-blue-800/20 bg-gradient-to-br from-blue-50/60 to-background dark:from-blue-950/20 dark:to-card/50 p-8 flex flex-row items-center gap-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className="size-16 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl shadow-blue-500/20">
                  <Monitor className="size-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-1.5">يعمل على جميع الشاشات</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    تجربة مثالية على الجوال والتابلت والحاسوب
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ Benefits ═══ */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">مميزات متكاملة</h2>
            <p className="text-lg text-muted-foreground">كل الأدوات التي تحتاجها لإدارة مطعمك رقمياً</p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-5">
              {BENEFITS.slice(0, 2).map((b, i) => (
                <BenefitCard key={i} {...b} idx={i} />
              ))}
            </div>
            <div className="space-y-5">
              {BENEFITS.slice(2, 4).map((b, i) => (
                <BenefitCard key={i + 2} {...b} idx={i + 2} />
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-5">
            {BENEFITS.slice(4, 6).map((b, i) => (
              <BenefitCard key={i + 4} {...b} idx={i + 4} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="py-28 bg-gradient-to-b from-muted/40 to-background">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">ثلاث خطوات لانطلاق مطعمك الرقمي</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto">
            {STEPS.map((step, i) => (
              <Reveal key={i} delay={i * 0.15} className="text-center">
                <div className="relative">
                  <div className="size-18 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/25">
                    <step.icon className="size-8 text-white" />
                  </div>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-9 left-[60%] w-[calc(80%)] h-px bg-gradient-to-r from-blue-400/50 to-transparent" />
                  )}
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Pricing ═══ */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">خطط تناسب الجميع</h2>
            <p className="text-lg text-muted-foreground">ابدأ مجاناً وطور مطعمك مع نمو أعمالك</p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {PRICING_PLANS.map((plan, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div
                  className={cn(
                    "relative flex flex-col rounded-3xl border p-8 transition-all duration-500",
                    plan.popular
                      ? "border-blue-400/50 bg-card shadow-2xl shadow-blue-500/20 dark:border-blue-500/30"
                      : "border-border/30 bg-card/50 hover:shadow-xl",
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-blue-600 text-white text-[11px] font-semibold shadow-lg ring-1 ring-blue-300/20">
                      الأكثر شعبية
                    </div>
                  )}
                  <div
                    className={cn(
                      "size-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                      plan.gradient,
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
                          "bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 shadow-lg shadow-blue-500/25",
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

      {/* ═══ Partners & Demo ═══ */}
      <section className="py-16 bg-gradient-to-b from-blue-500/[0.03] to-background">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">جرب منيو تجريبي</h2>
            <p className="text-lg text-muted-foreground">اختر مطعماً وشاهد كيف يعمل</p>
          </Reveal>
          <Reveal>
            <div className="flex gap-2 justify-center mb-10 flex-wrap">
              {PARTNERS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePartner(i)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
                    activePartner === i
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-border/30",
                  )}
                >
                  <Store className="size-3.5 inline-block me-1.5 -mt-0.5" />
                  {p.name}
                </button>
              ))}
            </div>
          </Reveal>
          <Reveal key={activePartner}>
            <Link
              href={`/menu/${PARTNERS[activePartner].slug}`}
              className="block max-w-lg mx-auto rounded-2xl border border-border/30 bg-card/60 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300/50 dark:hover:border-blue-700/30 hover:shadow-lg text-center"
            >
              <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
                <Store className="size-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">{PARTNERS[activePartner].name}</h3>
              <p className="text-sm text-muted-foreground mb-5">{PARTNERS[activePartner].desc}</p>
              <div className="inline-flex items-center gap-2 text-sm text-white font-medium bg-blue-600 px-5 py-2.5 rounded-full hover:bg-blue-700 transition-colors">
                <span>عرض المنيو التجريبي</span>
                <ArrowLeft className="size-4" />
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ═══ Testimonials ═══ */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">ماذا يقول عملاؤنا</h2>
            <p className="text-lg text-muted-foreground">كلمات من مطاعم ومقاهي تثق في الربط الذكي</p>
          </Reveal>
          <Reveal className="mb-5">
            <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-blue-50/40 to-background dark:from-blue-950/15 dark:to-card/30 p-8 md:p-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="size-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg">
                  {TESTIMONIALS[0].name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-blue-500/20 text-5xl leading-none mb-2 font-serif">
                    &ldquo;
                  </div>
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
                        <Star key={j} className="size-4 fill-blue-400 text-blue-400" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-5">
            {TESTIMONIALS.slice(1).map((t, i) => (
              <Reveal key={i} delay={0.1 + i * 0.08}>
                <div className="rounded-2xl border border-border/30 bg-card/50 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <p className="text-sm text-foreground/80 leading-relaxed mb-5 flex-1">
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-border/20">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-bold shrink-0">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(Math.floor(t.rating))].map((_, j) => (
                        <Star key={j} className="size-3.5 fill-blue-400 text-blue-400" />
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
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.12] via-background to-primary/5" />
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 size-[50rem] rounded-full bg-blue-500/[0.08] blur-3xl" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-balance">مستعد لانطلاق مطعمك الرقمي؟</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
              انضم إلى عشرات المطاعم والمقاهي واستقبل الطلبات عبر واتساب بدون وسيط
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
                <Button variant="outline" size="lg" className="text-lg px-10 h-14 border-2">
                  عرض الخطط
                </Button>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="text-xs text-muted-foreground mt-5">مجاناً بدون بطاقة ائتمان • إلغاء في أي وقت</p>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
