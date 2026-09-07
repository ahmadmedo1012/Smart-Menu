"use client"

import Link from "next/link"
import { MessageCircle, TrendingUp } from "lucide-react"
import { MotionArrowRight } from '@/components/ui/motion-icons';
import { m } from "motion/react"
import { Button } from "@/components/ui/button"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { QrCornerMark } from "@/components/ui/QrCornerMark"
import { Eyebrow } from "@/components/ui/Eyebrow"
import { IPhoneMockup } from "@/components/ui/iphone-mockup"
import { ScrollParallax } from "@/components/ui/scroll-parallax"
import { toArabicNumber } from "@/lib/format"
import { springDefault } from "@/lib/motion"

// round92-A7 (live audit A7): the hero text stack entered via framer-motion
// `hidden` variants (opacity: 0 + translateY) — SSR rendered the h1 INVISIBLE
// and it only revealed after JS hydration (prod: TTFB 99ms but LCP
// 1832–3052ms — the LCP element was waiting for JS, not the network). The
// entrance is now pure CSS so it starts at FIRST PAINT with no hydration
// gate, and the h1 keyframe starts VISIBLE (translate-only, opacity never
// leaves 1) so the LCP text is never hidden. The stagger feel is kept via
// the existing `.animate-fade-in` utility + per-element animation-delay —
// same final look. (Floating ticket/growth cards stay framer-driven: they
// are decorative, appear at 0.55s+ by design, and are never the LCP.)

export function HeroSection({ totalRestaurants, isLoading }: { totalRestaurants?: number; isLoading?: boolean }) {
        // Real count from fetchPublicStats (never hard-code marketing numbers —
        // round 82: "أكثر من 500 مطعم" fabricated while API returned 136).
        const trustCount = totalRestaurants && totalRestaurants > 0 ? totalRestaurants : 0;
        const showTrustBadge = !isLoading && trustCount > 0;

        return (
                <>
                        {/* round92-A7: LCP-safe hero settle — hoisted stylesheet (React 19
                            href+precedence), keyframe starts VISIBLE (opacity never 0). */}
                        <style href="r92-hero-entrance" precedence="high">
                                {'@keyframes r92-hero-settle{from{transform:translateY(12px)}to{transform:translateY(0)}}.r92-hero-settle{animation:r92-hero-settle .6s var(--ease-out-quart,ease-out) both}'}
                        </style>
                        <div
                                className="absolute inset-0 -z-10 overflow-clip pointer-events-none"
                                aria-hidden="true"
                        >
                                {/* One restrained warmth layer keeps the phone as the focal point. */}
                                {/* scroll-craft drift: subtle parallax on the warmth layer */}
                                <ScrollParallax
                                        rate={-0.15}
                                        maxTravel={30}
                                        className="absolute inset-0"
                                >
                                        {/* Kitchen glow — pulses with ambient breath */}
                                        <div
                                                className="absolute top-[12%] left-1/2 -translate-x-1/2 size-[min(72vmin,680px)] rounded-full animate-hero-glow-pulse"
                                                style={{
                                                        background: "radial-gradient(ellipse at center, oklch(0.55 0.19 45 / 0.14) 0%, oklch(0.55 0.19 45 / 0.04) 48%, transparent 72%)",
                                                        filter: "blur(54px)",
                                                }}
                                        />
                                        {/* Saffron mist — upper atmosphere warmth */}
                                        <div
                                                className="absolute top-0 end-0 size-[50vmin] rounded-full"
                                                style={{
                                                        background: "radial-gradient(ellipse at center, oklch(0.78 0.14 70 / 0.08) 0%, transparent 70%)",
                                                        filter: "blur(110px)",
                                                }}
                                        />
                                        {/* Ember floor wash — ground warmth */}
                                        <div
                                                className="absolute bottom-0 start-1/4 size-[56vmin] rounded-full"
                                                style={{
                                                        background: "radial-gradient(ellipse at center, oklch(0.44 0.17 52 / 0.08) 0%, transparent 70%)",
                                                        filter: "blur(100px)",
                                                }}
                                        />
                                        {/* Ambient micro-orb — subtle depth particle */}
                                        <div
                                                className="absolute top-[30%] start-[15%] size-32 rounded-full animate-orb-float opacity-30"
                                                style={{
                                                        background: "radial-gradient(circle, oklch(0.78 0.14 70 / 0.4) 0%, transparent 70%)",
                                                        filter: "blur(40px)",
                                                }}
                                        />
                                </ScrollParallax>
                        </div>

                        <ContainerScroll
                                className="bg-background"
                                titleComponent={
                                <div>
                                        {/* Eyebrow — Naskh editorial voice, above the fold */}
                                        <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
                                        <Eyebrow>منيو رقمي، طلب مباشر على واتساب</Eyebrow>
                                        </div>
                                        {/* round92-A7: plain h1 + CSS settle — visible in the SSR HTML
                                            on first paint (never opacity:0), no hydration gate. */}
                                        <h1
                                                className="r92-hero-settle font-display text-[2.1rem] sm:text-5xl md:text-6xl font-semibold leading-[1.25] text-balance max-w-3xl mx-auto"
                                        >
                                                <span className="block">منيو رقمي لمطعمك</span>
                                                <span className="block">
                                                        <span className="text-gradient-orange">الطلبات تصل</span> على واتساب
                                                </span>
                                        </h1>
                                        <p className="animate-fade-in text-sm sm:text-base text-foreground/65 max-w-2xl mx-auto leading-[1.75] mb-8" style={{ animationDelay: "0.27s" }}>
                                                أنشئ منيو واضحاً، استقبل الطلبات على واتساب، وتابع أداء مطعمك من لوحة واحدة.
                                        </p>
                                        <div className="animate-fade-in flex gap-3 sm:gap-4 justify-center flex-wrap" style={{ animationDelay: "0.39s" }}>
                                                <Link href="/subscribe">
                                                        <Button variant="flame" size="lg" className="text-sm sm:text-base">
                                                                ابدأ مجاناً <MotionArrowRight className="size-4 sm:size-5 rtl:rotate-180" />
                                                        </Button>
                                                </Link>
                                                <Link href="/login">
                                                        <Button variant="outline" size="lg" className="text-sm sm:text-base">
                                                                تسجيل الدخول
                                                        </Button>
                                                </Link>
                                        </div>
                                        {/* Trust badge — shows real count, loading skeleton, or hidden when unavailable */}
                                        {isLoading ? (
                                                <div className="animate-fade-in inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3 py-1 mt-6" style={{ animationDelay: "0.51s" }}>
                                                        <span className="size-1.5 rounded-full bg-orange/40 animate-pulse" />
                                                        <span className="h-3 w-24 rounded bg-orange/20 animate-pulse" />
                                                </div>
                                        ) : showTrustBadge ? (
                                                <div className="animate-fade-in inline-flex items-center gap-1.5 rounded-full border border-orange/25 bg-orange/8 px-3.5 py-1.5 text-[11px] font-medium text-ember dark:text-saffron mt-6 shadow-sm" style={{ animationDelay: "0.51s" }}>
                                                        {/* a11y(round84): text-orange measured 4.47:1 on the cream hero bg (axe serious
                                                         * violation — 0.03 short of AA). ember = oklch(0.44 0.17 52) ≈ 7:1 light,
                                                         * saffron ≈ 8:1 on dark. Same brand hue family, world-class contrast. */}
                                                        <span className="size-1.5 rounded-full bg-orange animate-pulse-dot" />
                                                        {/* r93-W2a (U3): toLocaleString("ar") كان يُخرج أرقامًا هندية (١٢٣)
                                                         * وفاصل آلاف ICU قد يختلف بين Node/المتصفح عند ≥1000 (خطر mismatch
                                                         * hydration لأن العبارة تُصيّر SSR ثم عميلًا). المنسّق القياسي
                                                         * toArabicNumber: أرقام غربية بلا فاصل — متسق مع StatsSection
                                                         * في نفس الصفحة وسياسة المنصة (format.ts). */}
                                                        أكثر من {toArabicNumber(trustCount)} مطعم يثقون فينا
                                                </div>
                                        ) : null}
                                </div>
                                }
                        >
                                <div className="relative flex justify-center sm:px-4 md:px-0">
                                        {/* QR-corner signature — the scan → WhatsApp moment anchors the hero */}
                                        <div aria-hidden="true" className="absolute -top-4 end-[4%] sm:end-[12%] md:end-[16%] -z-10 opacity-90">
                                                <QrCornerMark label="" size={84} className="opacity-25 blur-[1px]" />
                                        </div>
                                        {/* scroll-craft parallax: phone recedes slightly, foreground cards float */}
                                        <ScrollParallax
                                                rate={-0.1}
                                                maxTravel={20}
                                                className="relative w-full max-w-[240px] sm:max-w-[280px] md:max-w-[300px] lg:max-w-[320px]"
                                        >
                                                <IPhoneMockup
                                                        model="15-pro"
                                                        color="natural-titanium"
                                                        wallpaper="/hero-phone.webp"
                                                        wallpaperFit="cover"
                                                        scale={1}
                                                        className="w-full"
                                                />
                                        </ScrollParallax>
                                        {/* Order ticket — the WhatsApp handoff, itemized like a real till receipt */}
                                        <m.div
                                                initial={{ opacity: 0, y: 14, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: 0.55, ...springDefault }}
                                                className="absolute top-5 -start-2 sm:-start-5 md:-start-8 z-10"
                                        >
                                                <div className="animate-float-slow">
                                                        <div className="glass-strong rounded-2xl px-3.5 py-3 flex flex-col gap-2 shadow-xl">
                                                                <div className="flex items-center gap-2.5">
                                                                        <div className="relative size-9 rounded-full bg-whatsapp/15 flex items-center justify-center shrink-0">
                                                                                <MessageCircle className="size-4 text-whatsapp" />
                                                                                <span className="absolute -top-0.5 -end-0.5 size-2.5 rounded-full bg-whatsapp ring-2 ring-background" />
                                                                        </div>
                                                                        <div className="text-start">
                                                                                <p className="text-xs font-bold text-foreground leading-tight">طلب جديد وصل</p>
                                                                                <p className="text-[10px] text-muted-foreground mt-0.5">عبر واتساب</p>
                                                                        </div>
                                                                </div>
                                                                <div className="animate-ticket-drop flex items-center justify-between gap-3 rounded-xl bg-background/70 border border-border/40 px-3 py-1.5">
                                                                        <div className="flex items-center gap-1.5">
                                                                                <span className="size-1.5 rounded-full bg-whatsapp" />
                                                                                <span className="text-[10px] font-bold text-foreground">بيتزا مارغريتا ×2</span>
                                                                        </div>
                                                                        <span dir="ltr" className="text-[10px] font-bold text-ember dark:text-saffron">32.00 د.ل</span>
                                                                </div>
                                                        </div>
                                                </div>
                                        </m.div>
                                        {/* Monthly growth — retail numerals, LTR */}
                                        <m.div
                                                initial={{ opacity: 0, y: 14, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: 0.75, ...springDefault }}
                                                className="absolute bottom-24 -end-2 sm:-end-5 md:-end-8 z-10"
                                        >
                                                <div className="animate-float-slow [animation-delay:1.5s]">
                                                        <div className="glass-strong rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-xl">
                                                                <div className="size-9 rounded-full bg-orange/15 flex items-center justify-center shrink-0">
                                                                        <TrendingUp className="size-4 text-orange" />
                                                                </div>
                                                                <div className="text-start">
                                                                        <p dir="ltr" className="text-sm font-bold text-foreground leading-none">+32%</p>
                                                                        <p className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">نمو الطلبات الشهرية</p>
                                                                </div>
                                                        </div>
                                                </div>
                                        </m.div>
                                </div>
                        </ContainerScroll>
                </>
        )
}
