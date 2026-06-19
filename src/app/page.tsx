"use client";
import { toArabicNumber } from "@/lib/format";

import { useRef, useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft, UtensilsCrossed, MessageCircle, LayoutDashboard,
  Store, Star, ChefHat, Users, ShoppingCart, BadgePercent,
  Sparkles, QrCode, Smartphone, BarChart3, Gift, Shield,
  Check, Menu, X, Phone, Globe, Monitor, UserPlus, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import HeroAnimation from "@/components/landing/HeroAnimation";
import { cn } from "@/lib/utils";

// ─── Data ────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: Smartphone,
    title: "منيو رقمي تفاعلي",
    desc: "قائمة طعام رقمية مع صور وأسعار وتفاصيل. محدثة بشكل لحظي دون طباعة.",
    gradient: "from-amber-400 to-amber-600",
  },
  {
    icon: MessageCircle,
    title: "طلب عبر واتساب",
    desc: "يصل الطلب مباشرة إلى واتساب المطعم مع تفاصيل كاملة وجاهزة للتحضير.",
    gradient: "from-green-400 to-green-600",
  },
  {
    icon: QrCode,
    title: "QR كود مخصص",
    desc: "رمز QR خاص لمطعمك للطباعة على الطاولات والفواتير والمواد الدعائية.",
    gradient: "from-blue-400 to-blue-600",
  },
  {
    icon: BarChart3,
    title: "إحصائيات وتحليلات",
    desc: "تقارير مفصلة عن الطلبات والأصناف الأكثر طلباً وسلوك الزبائن.",
    gradient: "from-purple-400 to-purple-600",
  },
  {
    icon: Gift,
    title: "برنامج ولاء",
    desc: "نظام نقاط ومكافآت يحفز الزبائن على العودة ويزيد ارتباطهم بمطعمك.",
    gradient: "from-red-400 to-red-600",
  },
  {
    icon: Shield,
    title: "تحكم كامل",
    desc: "لوحة تحكم متكاملة لإدارة المنيو والطلبات والموظفين والإعدادات.",
    gradient: "from-teal-400 to-teal-600",
  },
];

const PARTNERS = [
  { name: "مقهى الواحة", slug: "menu/al-waha-cafe", desc: "مشروبات وحلويات" },
  { name: "مطعم الأصيل", slug: "menu/al-aseel", desc: "مأكولات ليبية تقليدية" },
  { name: "بيتزا روما", slug: "menu/pizza-roma", desc: "بيتزا إيطالية طازجة" },
];

const STATS = [
  { icon: Store, value: 50, suffix: "+", label: "مطعم ومقهى" },
  { icon: ShoppingCart, value: 10000, suffix: "+", label: "طلب شهرياً" },
  { icon: Users, value: 30000, suffix: "+", label: "زبون نشط" },
  { icon: Star, value: 4.9, suffix: "", label: "تقييم المستخدمين", decimals: 1 },
];

const STEPS = [
  { title: "1. سجل مطعمك", desc: "أدخل بيانات مطعمك في دقائق وأنشئ حساباً مجاناً", icon: UserPlus },
  { title: "2. أضف المنيو", desc: "أضف الأصناف والفئات والأسعار والصور بسهولة", icon: UtensilsCrossed },
  { title: "3. شارك الرابط", desc: "شارك رابط المنيو مع زبائنك وابدأ باستقبال الطلبات", icon: Share2 },
];

const PRICING_PLANS = [
  {
    name: "مجاني", price: "0", period: "دائماً",
    features: ["منيو رقمي", "10 أصناف", "طلبات واتساب", "إحصائيات أساسية"],
    cta: "ابدأ مجاناً", popular: false, gradient: "from-gray-400 to-gray-500",
  },
  {
    name: "أساسي", price: "49", period: "شهرياً",
    features: ["منيو رقمي", "50 صنف", "برنامج ولاء", "QR كود", "دعم فني"],
    cta: "اشترك الآن", popular: true, gradient: "from-amber-500 to-amber-600",
  },
  {
    name: "احترافي", price: "129", period: "شهرياً",
    features: ["حتى 3 منيوهات", "200 صنف", "ولاء متقدم", "إحصائيات متقدمة", "تخصيص كامل", "دعم فوري"],
    cta: "اشترك الآن", popular: false, gradient: "from-amber-500 via-yellow-500 to-amber-600",
  },
];

const SHOWCASES = [
  {
    title: "منيو رقمي أنيق",
    desc: "قائمة طعام بتصميم جذاب تعرض أصنافك بأفضل صورة",
    icon: Smartphone,
  },
  {
    title: "طلبات لحظية",
    desc: "الطلبات تصل مباشرة لواتساب المطعم مع تفاصيل كاملة",
    icon: MessageCircle,
  },
  {
    title: "لوحة تحكم متكاملة",
    desc: "إدارة المطاعم والمنيو والطلبات والإحصائيات من مكان واحد",
    icon: LayoutDashboard,
  },
  {
    title: "يعمل على جميع الشاشات",
    desc: "تجربة مثالية على الجوال والتابلت والحاسوب",
    icon: Monitor,
  },
];

// ─── Scroll-triggered reveal ─────────────────────────────────────────

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className,
      )}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

// ─── Animated counter ────────────────────────────────────────────────

function CountUp({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else { setCount(start); }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, value]);

  const display = decimals > 0 ? count.toFixed(decimals) : toArabicNumber(Math.floor(count));
  return <span ref={ref}>{display}{suffix}</span>;
}

// ─── Floating nav for mobile ─────────────────────────────────────────

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />}
      <div className={cn(
        "fixed top-0 left-0 bottom-0 z-50 w-72 bg-background border-l shadow-2xl transition-transform duration-400 ease-out",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-8">
            <span className="text-lg font-bold text-gradient">الربط الذكي</span>
            <button onClick={onClose} className="size-9 rounded-full border flex items-center justify-center hover:bg-muted transition-colors">
              <X className="size-4" />
            </button>
          </div>
          <div className="space-y-2">
            <Link href="/pricing" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium">
              <Star className="size-4 text-amber-500" />
              الخطط والأسعار
            </Link>
            <Link href={`/menu/${PARTNERS[0].slug}`} onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium">
              <Store className="size-4 text-amber-500" />
              منيو تجريبي
            </Link>
            <Link href="/login" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors text-sm font-medium">
              <LayoutDashboard className="size-4 text-amber-500" />
              لوحة التحكم
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────

export default function Home() {
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />

      {/* ═══════════════ Navbar ═══════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-30 h-16 bg-background/60 backdrop-blur-2xl border-b border-border/30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => setMobileNav(true)} className="lg:hidden size-9 rounded-lg border flex items-center justify-center hover:bg-muted transition-colors">
              <Menu className="size-4" />
            </button>
            <span className="text-lg font-bold">
              <span className="text-gradient-amber">الربط الذكي</span>
            </span>
            <div className="hidden lg:flex items-center gap-1">
              <Link href="/pricing" className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                الخطط والأسعار
              </Link>
              <Link href={`/menu/${PARTNERS[0].slug}`} className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                منيو تجريبي
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/subscribe">
              <Button variant="default" size="sm" className="rounded-xl">
                ابدأ الآن مجاناً
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════ Hero ═══════════════ */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-amber-50/40 to-background dark:via-amber-950/10" />
        <div className="hero-mesh">
          <div className="blob" />
          <div className="blob" />
          <div className="blob" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.62_0.14_55/0.03),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.16_65/0.05),transparent_60%)]" />

        {/* Announcement badge */}
        <Reveal delay={0} className="absolute top-24 right-4 md:right-12 z-20">
          <div className="glass px-4 py-2 rounded-full hidden sm:flex items-center gap-2 text-xs font-medium shadow-lg">
            <Sparkles className="size-3.5 text-amber-500" />
            <span>المنصة الأسرع نمواً في 2026</span>
          </div>
        </Reveal>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center py-10">
          {/* Text */}
          <div className="text-center lg:text-right order-last lg:order-first">
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm mb-6 border border-amber-500/20">
                <BadgePercent className="size-4" />
                منصة إدارة منيو رقمية للمطاعم
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1]">
                <span className="text-gradient-animated">حوّل مطعمك</span>
                <br />
                <span className="text-foreground">إلى منيو رقمي</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                استقبل طلبات الزبائن عبر واتساب بدون عناء. منيو رقمي احترافي لمطعمك يفتح على جميع الأجهزة.
              </p>
            </Reveal>
            <Reveal delay={0.3}>
              <div className="flex gap-3 justify-center lg:justify-start flex-wrap">
                <Link href="/login">
                  <Button size="lg" className="text-lg px-8 h-13 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-xl shadow-amber-500/25 hover:shadow-2xl hover:shadow-amber-500/30 border-0 transition-all duration-300">
                    ابدأ مجاناً
                    <ArrowLeft className="ms-2 size-5" />
                  </Button>
                </Link>
                <Link href={`/menu/${PARTNERS[0].slug}`}>
                  <Button variant="outline" size="lg" className="text-lg px-8 h-13 border-2">
                    عرض منيو تجريبي
                  </Button>
                </Link>
              </div>
            </Reveal>

            {/* Social proof mini */}
            <Reveal delay={0.4}>
              <div className="flex items-center gap-4 mt-8 justify-center lg:justify-start">
                <div className="flex -space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="size-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-background flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <span className="font-bold">+50</span>{" "}
                  <span className="text-muted-foreground">مطعماً يثقون بنا</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Phone mockup */}
          <Reveal delay={0.15} className="order-first lg:order-last">
            <HeroAnimation />
          </Reveal>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-xs text-muted-foreground animate-float">
          <span>اسحب لأسفل</span>
          <div className="size-5 rounded-full border-2 border-primary/30 flex items-center justify-center">
            <div className="size-1.5 rounded-full bg-primary/60 animate-breath" />
          </div>
        </div>
      </section>

      {/* ═══════════════ Demo Preview ═══════════════ */}
      <section className="py-20 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Reveal delay={0}>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-gradient-amber">اكتشف كيف سيبدو منيو مطعمك</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              اختر مطعماً من القائمة وشاهد منيو تجريبي
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {PARTNERS.map((p, i) => (
                <Link
                  key={i}
                  href={`/menu/${p.slug}`}
                  className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card/50 p-5 hover:border-amber-200/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-right"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Store className="size-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary font-medium">
                    <span>عرض المنيو</span>
                    <ArrowLeft className="size-3 group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-8 flex items-center justify-center">
              <Link
                href="/menu/al-waha-cafe"
                className="inline-flex items-center gap-2 h-13 px-8 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-amber-700 transition-all text-base"
              >
                <Store className="size-5" />
                عرض منيو تجريبي
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              أو{" "}
              <Link href="/demo" className="text-primary underline hover:text-amber-600 font-medium">
                جرب لوحة التحكم
              </Link>
              {" "}كصاحب مطعم
            </p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ Showcase ═══════════════ */}
      <section className="py-20 border-y border-border/40 bg-muted/20">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-gradient-amber">لماذا الربط الذكي؟</span>
            </h2>
            <p className="text-lg text-muted-foreground">كل ما يحتاجه مطعمك في منصة واحدة</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SHOWCASES.map((s, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="glass-card rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center mx-auto mb-4">
                    <s.icon className="size-7 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ Stats ═══════════════ */}
      <section className="py-16 bg-gradient-to-br from-amber-500/5 to-primary/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <Reveal key={i} delay={i * 0.1} className="text-center">
                <div className="inline-flex items-center justify-center size-14 rounded-2xl glass mb-3 mx-auto">
                  <s.icon className="size-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gradient-amber mb-1">
                  <CountUp value={s.value} suffix={s.suffix} decimals={"decimals" in s ? (s as any).decimals : 0} />
                </div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ Benefits Grid ═══════════════ */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-gradient-animated">مميزات متكاملة</span>
            </h2>
            <p className="text-lg text-muted-foreground">كل الأدوات التي تحتاجها لإدارة مطعمك رقمياً</p>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b, i) => (
              <Reveal key={i} delay={i * 0.08}>
                <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card/50 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-400">
                  <div className={cn(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
                    b.gradient.replace("from-", "from-").replace("to-", "to-") + "/5",
                  )} />
                  <div className="relative z-10">
                    <div className={cn(
                      "size-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
                      b.gradient,
                    )}>
                      <b.icon className="size-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ How It Works ═══════════════ */}
      <section className="py-24 bg-muted/20 border-y border-border/40">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-gradient-amber">ثلاث خطوات لانطلاق مطعمك الرقمي</span>
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={i} delay={i * 0.15} className="text-center">
                  <div className="relative">
                    <div className="size-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/25">
                      <Icon className="size-7 text-white" />
                    </div>
                    {i < 2 && (
                      <div className="hidden md:block absolute top-8 left-[60%] w-[calc(80%)] h-0.5 bg-gradient-to-r from-amber-300/50 to-transparent" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════ Pricing Preview ═══════════════ */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-gradient-animated">خطط تناسب الجميع</span>
            </h2>
            <p className="text-lg text-muted-foreground">ابدأ مجاناً وطور مطعمك مع نمو أعمالك</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING_PLANS.map((plan, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <div className={cn(
                  "relative flex flex-col rounded-3xl border p-7 transition-all duration-500 hover:scale-[1.02] card-premium",
                  plan.popular
                    ? "border-amber-300/50 bg-gradient-to-b from-amber-50/80 to-white shadow-xl shadow-amber-500/15 dark:from-amber-950/20 dark:to-card dark:border-amber-500/30"
                    : "border-border/40 bg-card/50 hover:shadow-lg",
                )}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow-lg">
                      الأكثر شعبية
                    </div>
                  )}
                  <div className={cn("size-10 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-lg", plan.gradient)}>
                    <Star className={cn("size-5 text-white", i === 2 && "text-yellow-300")} />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">د.ل / {plan.period}</span>
                  </div>
                  <div className="space-y-2.5 mb-7 flex-1">
                    {plan.features.map((f, j) => (
                      <div key={j} className="flex items-center gap-2.5 text-sm">
                        <Check className="size-4 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/pricing">
                    <Button className={cn(
                      "w-full h-11 rounded-xl",
                      plan.popular && "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/20",
                    )} variant={plan.popular ? "default" : "outline"}>
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.3} className="text-center mt-8">
            <Link href="/pricing" className="text-sm text-primary hover:text-amber-600 transition-colors font-medium">
              عرض جميع الخطط والمقارنة →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ Partners ═══════════════ */}
      <section className="py-24 bg-muted/20 border-y border-border/40">
        <div className="max-w-6xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm mb-4 mx-auto">
              <ChefHat className="size-4 text-primary" />
              <span className="text-primary font-medium">مطاعم تثق بنا</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="text-gradient-amber">شركاؤنا في النجاح</span>
            </h2>
            <p className="text-lg text-muted-foreground">انضم إلى عشرات المطاعم التي تستخدم الربط الذكي</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {PARTNERS.map((p, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <Link
                  href={`/menu/${p.slug}`}
                  className="block glass-card rounded-2xl p-8 text-center group relative overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 shine-sweep"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="size-20 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                      <Store className="size-9 text-primary/70" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">{p.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{p.desc}</p>
                    <div className="flex items-center justify-center gap-1 text-sm text-primary font-medium">
                      <span>عرض المنيو</span>
                      <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform duration-300" />
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ CTA ═══════════════ */}
      <section className="py-24 relative overflow-hidden bg-subtle-pattern">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-background to-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[40rem] rounded-full bg-amber-500/5 blur-3xl" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <Reveal delay={0}>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="text-gradient-amber">مستعد لانطلاق مطعمك الرقمي؟</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
              انضم إلى عشرات المطاعم والمقاهي واستقبل الطلبات عبر واتساب بدون وسيط
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/login">
                <Button size="lg" className="text-lg px-10 h-13 animate-pulse-glow bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-xl shadow-amber-500/25 border-0">
                  ابدأ مجاناً الآن
                  <ArrowLeft className="ms-2 size-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="text-lg px-10 h-13 border-2">
                  عرض الخطط
                </Button>
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="text-xs text-muted-foreground mt-4">مجاناً بدون بطاقة ائتمان • إلغاء في أي وقت</p>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════ Footer ═══════════════ */}
      <footer className="border-t border-border/40 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <span className="text-lg font-bold text-gradient-amber">الربط الذكي</span>
              <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
                منصة رقمية لإدارة منيو المطاعم والمقاهي واستقبال الطلبات عبر واتساب
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3">روابط سريعة</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link href="/pricing" className="block hover:text-foreground transition-colors">الخطط</Link>
                <Link href={`/menu/${PARTNERS[0].slug}`} className="block hover:text-foreground transition-colors">منيو تجريبي</Link>
                <Link href="/login" className="block hover:text-foreground transition-colors">تسجيل الدخول</Link>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3">تواصل معنا</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>واتساب: +218 91 111 1111</p>
                <p>بريد: info@rabtzaki.ly</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border/30 pt-6 text-center text-xs text-muted-foreground">
            <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()} — الربط الذكي | Smart Menu</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
