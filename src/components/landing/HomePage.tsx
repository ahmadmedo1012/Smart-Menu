"use client";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { ArrowLeft, Sparkles, BadgePercent, Store, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Header } from "@/components/layout/Header";
import { BENEFITS, PARTNERS, STATS, STEPS, PRICING_PLANS, SHOWCASES, TESTIMONIALS } from "./landing-data";
import Reveal from "./Reveal";
import CountUp from "./CountUp";
import HeroVideo from "./HeroVideo";

export default function HomePage() {
  const [s0, s1, s2, s3] = SHOWCASES;
  return (
    <div className="flex flex-col min-h-screen bg-dot-pattern/30">
      <Header />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-blue-50/20 to-background dark:via-blue-950/10" />
        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center py-10">
          <div className="text-center lg:text-right order-last lg:order-first">
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary dark:text-blue-400 text-sm mb-6 border border-primary/20">
                <BadgePercent className="size-4" /> منصة إدارة منيو رقمية للمطاعم
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="text-5xl md:text-7xl font-bold mb-5 leading-[0.95] tracking-tight">
                <span className="text-gradient-animated">حوّل مطعمك</span><br /><span className="text-foreground">إلى منيو رقمي</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                استقبل طلبات الزبائن عبر واتساب بدون عناء. منيو رقمي احترافي لمطعمك يفتح على جميع الأجهزة.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="flex gap-3 justify-center lg:justify-start flex-wrap">
                <Link href="/subscribe">
                  <Button variant="gradient" size="lg" className="text-lg px-8 h-14">
                    ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
                  </Button>
                </Link>
                <Link href={`/menu/${PARTNERS[0].slug}`}>
                  <Button variant="gradient-outline" size="lg" className="text-lg px-8 h-14">عرض منيو تجريبي</Button>
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.4}>
              <div className="flex items-center gap-3 mt-8 justify-center lg:justify-start">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-bold text-foreground">5.0</span>
                  <span className="text-muted-foreground"> +50 مطعماً يثقون بنا</span>
                </div>
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.15} className="order-first lg:order-last"><HeroVideo /></Reveal>
        </div>
        <div className="absolute bottom-8 start-1/2 -translate-x-1/2 animate-float">
          <div className="size-1.5 rounded-full bg-primary/40" />
        </div>
      </section>

      {/* Demo Preview */}
      <section className="py-20 bg-gradient-to-b from-blue-500/5 to-transparent">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <Reveal delay={0}>
            <h2 className="text-3xl md:text-4xl font-bold mb-3"><span>اكتشف كيف سيبدو منيو مطعمك</span></h2>
            <p className="text-lg text-muted-foreground mb-8">اختر مطعماً من القائمة وشاهد منيو تجريبي</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-6xl mx-auto">
              {PARTNERS.map((p, i) => (
                <Link key={i} href={`/menu/${p.slug}`} className={cn("group relative overflow-hidden rounded-2xl border p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-right",
                  i === 0 ? "bg-gradient-to-br from-blue-50/60 to-card/50 dark:from-blue-950/15 dark:to-card/50 border-blue-200/30 hover:border-blue-300/50" :
                  i === 1 ? "bg-card/50 border-border/30 hover:border-blue-300/50" :
                  "bg-gradient-to-br from-blue-50/50 to-card/50 dark:from-blue-950/10 dark:to-card/50 border-border/30 hover:border-blue-300/50")}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("size-10 rounded-xl bg-gradient-to-br flex items-center justify-center group-hover:scale-110 transition-transform",
                      i === 0 ? "from-blue-400/20 to-blue-600/10" : i === 1 ? "from-blue-400/20 to-blue-600/10" : "from-blue-400/20 to-blue-600/10")}>
                      <Store className="size-5 text-primary" />
                    </div>
                    <div><h3 className="font-bold">{p.name}</h3><p className="text-xs text-muted-foreground">{p.desc}</p></div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    <span>عرض المنيو</span><ArrowLeft className="size-3 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <Link href={`/menu/${PARTNERS[0].slug}`} className="inline-flex items-center gap-2 h-14 px-8 mt-8 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:from-blue-600 hover:to-blue-700 transition-all text-base">
              <Store className="size-5" /> عرض منيو تجريبي
            </Link>
            <p className="text-xs text-muted-foreground mt-3">أو <Link href="/demo" className="text-primary hover:text-blue-600 font-medium">جرب لوحة التحكم</Link> كصاحب مطعم</p>
          </Reveal>
        </div>
      </section>

      {/* Showcase — bento: 2 large feature cards + 2 compact */}
      <section className="py-20 border-y border-border/40 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3"><span>لماذا الربط الذكي؟</span></h2>
            <p className="text-lg text-muted-foreground">كل ما يحتاجه مطعمك في منصة واحدة</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Card 0 — large feature (full width) */}
            <Reveal delay={0} className="sm:col-span-2">
              <div className="h-full rounded-2xl border border-border/40 bg-card/50 p-7 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-row items-center gap-6">
                <div className="size-16 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <s0.icon className="size-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{s0.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s0.desc}</p>
                </div>
              </div>
            </Reveal>
            {/* Card 1 — compact */}
            <Reveal delay={0.1}>
              <div className="h-full rounded-2xl border border-border/40 bg-card/50 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-center">
                <div className="size-12 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-600/10 flex items-center justify-center mx-auto mb-3">
                  <s1.icon className="size-6 text-primary" />
                </div>
                <h3 className="font-bold mb-1">{s1.title}</h3>
                <p className="text-xs text-muted-foreground">{s1.desc}</p>
              </div>
            </Reveal>
            {/* Card 2 — stat-like minimal */}
            <Reveal delay={0.15}>
              <div className="h-full rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 to-transparent p-5 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s2.icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm">{s2.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{s2.desc}</p>
              </div>
            </Reveal>
            {/* Card 3 — large feature (full width) */}
            <Reveal delay={0.2} className="sm:col-span-2">
              <div className="h-full rounded-2xl border border-border/40 bg-card/50 p-7 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-row items-center gap-6">
                <div className="size-16 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <s3.icon className="size-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{s3.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s3.desc}</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Stats — simpler, no glass containers */}
      <section className="py-16 bg-gradient-to-br from-blue-500/5 to-primary/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <Reveal key={i} delay={i * 0.1} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1"><CountUp value={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} /></div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits — alternating icon-top / icon-left */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3"><span>مميزات متكاملة</span></h2>
            <p className="text-lg text-muted-foreground">كل الأدوات التي تحتاجها لإدارة مطعمك رقمياً</p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
                  i % 2 === 0 ? "p-6" : "p-5"
                )}>
                  <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br", b.gradient.replace("from-", "from-").replace("to-", "to-") + "/5")} />
                  <div className="relative z-10">
                    {i % 2 === 0 ? (
                      <>
                        <div className={cn("size-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg", b.gradient)}>
                          <b.icon className="size-6 text-white" />
                        </div>
                        <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                      </>
                    ) : (
                      <div className="flex items-start gap-4">
                        <div className={cn("size-12 shrink-0 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", b.gradient)}>
                          <b.icon className="size-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold mb-1.5">{b.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — cleaner connecting line */}
      <section className="py-24 bg-muted/20 border-y border-border/40">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3"><span>ثلاث خطوات لانطلاق مطعمك الرقمي</span></h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={i} delay={i * 0.15} className="text-center">
                  <div className="relative">
                    <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/25">
                      <Icon className="size-7 text-white" />
                    </div>
                    {i < 2 && <div className="hidden md:block absolute top-8 left-[60%] w-[calc(80%)] h-px bg-gradient-to-r from-primary/40 to-transparent" />}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing — md:grid-cols-2 */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3"><span>خطط تناسب الجميع</span></h2>
            <p className="text-lg text-muted-foreground">ابدأ مجاناً وطور مطعمك مع نمو أعمالك</p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {PRICING_PLANS.map((plan, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div className={cn("relative flex flex-col rounded-3xl border p-7 transition-all duration-500 hover:scale-[1.02] card-premium",
                  plan.popular ? "border-blue-300/50 bg-gradient-to-b from-blue-50/80 to-white shadow-xl shadow-blue-500/15 dark:from-blue-950/20 dark:to-card dark:border-blue-500/30" : "border-border/40 bg-card/50 hover:shadow-lg")}>
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/30 ring-1 ring-blue-300/30">
                      الأكثر شعبية
                    </div>
                  )}
                  <div className={cn("size-10 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg", plan.gradient)}>
                    <Star className="size-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">د.ل / {plan.period}</span>
                  </div>
                  <div className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2.5 text-sm">
                        <Check className="size-4 text-primary shrink-0" /><span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/pricing">
                    <Button className={cn("w-full h-11 rounded-xl", plan.popular && "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/20")} variant={plan.popular ? "default" : "outline"}>{plan.cta}</Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3} className="text-center mt-8">
            <Link href="/pricing" className="text-sm text-primary hover:text-blue-600 transition-colors font-medium">عرض جميع الخطط والمقارنة →</Link>
          </Reveal>
        </div>
      </section>

      {/* Partners — bigger, more prominent */}
      <section className="py-24 bg-muted/20 border-y border-border/40">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3"><span>شركاؤنا في النجاح</span></h2>
            <p className="text-lg text-muted-foreground">انضم إلى عشرات المطاعم التي تستخدم الربط الذكي</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {PARTNERS.map((p, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <Link href={`/menu/${p.slug}`} className="block rounded-2xl border border-border/20 bg-background/40 p-10 text-center group hover:bg-gradient-to-br hover:from-blue-50/30 hover:to-background dark:hover:from-blue-950/10 hover:shadow-lg hover:-translate-y-1.5 transition-all duration-500">
                  <div className="size-24 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:shadow-xl transition-all duration-500">
                    <Store className="size-11 text-primary/60 group-hover:text-primary transition-colors duration-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{p.name}</h3>
                  <p className="text-base text-muted-foreground mb-4">{p.desc}</p>
                  <div className="w-fit mx-auto flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 text-sm text-primary font-medium group-hover:bg-primary/10 transition-colors">
                    <span>عرض المنيو</span><ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform duration-300" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — left border accent, varied ratings */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3"><span>ماذا يقول عملاؤنا</span></h2>
            <p className="text-lg text-muted-foreground">كلمات من مطاعم ومقاهي تثق في الربط الذكي</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div className="relative h-full rounded-2xl border border-border/40 bg-card/40 p-7 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  {/* Subtle top accent instead of side-tab */}
                  <div className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-gradient-to-r from-blue-400/30 to-transparent" />
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-bold text-blue-500">{t.rating}</span>
                    <div className="flex gap-0.5">
                      {[...Array(Math.floor(t.rating))].map((_, j) => (
                        <Star key={j} className="size-3.5 fill-blue-400 text-blue-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-5 flex-1">&ldquo;{t.content}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                    <div className="size-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden border-t border-blue-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-background to-primary/10" />
        <div className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 size-[40rem] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <Reveal delay={0}><h2 className="text-3xl md:text-5xl font-bold mb-4"><span>مستعد لانطلاق مطعمك الرقمي؟</span></h2></Reveal>
          <Reveal delay={0.1}>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">انضم إلى عشرات المطاعم والمقاهي واستقبل الطلبات عبر واتساب بدون وسيط</p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/subscribe"><Button variant="gradient" size="lg" className="text-lg px-10 h-14 magnetic-btn">ابدأ مجاناً الآن <ArrowLeft className="ms-2 size-5" /></Button></Link>
              <Link href="/pricing"><Button variant="outline" size="lg" className="text-lg px-10 h-14 border-2">عرض الخطط</Button></Link>
            </div>
          </Reveal>
          <Reveal delay={0.3}><p className="text-xs text-muted-foreground mt-4">مجاناً بدون بطاقة ائتمان • إلغاء في أي وقت</p></Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
