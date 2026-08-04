"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { IPhoneMockup } from "@/components/ui/iphone-mockup"
import { springDefault } from "@/lib/motion"

// Staggered entrance for hero content — professional premium reveal
const heroItem = {
	hidden: { opacity: 0, y: 16 },
	show: (i: number) => ({
		opacity: 1,
		y: 0,
		transition: { delay: 0.15 + i * 0.12, ...springDefault },
	}),
};

export function HeroSection() {
    return (
        <>
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 size-[70vmin] rounded-full pointer-events-none z-0"
                style={{
                    background: "radial-gradient(ellipse at center, oklch(0.68 0.19 45 / 0.10) 0%, transparent 70%)",
                    filter: "blur(120px)",
                }}
            />

            <ContainerScroll
                className="bg-background"
                titleComponent={
                    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0 } } }}>
                        <motion.h1 variants={heroItem} custom={0} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.3] text-balance max-w-4xl mx-auto">
                            <span className="block">
                                منيو رقمي لمطعمك
                            </span>
                            <span className="block"> </span>
                            <span className="block">
                                <span className="text-orange">الطلبات تصل</span> على واتساب
                            </span>
                        </motion.h1>

                        <motion.div variants={heroItem} custom={1} className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-gradient-to-r from-orange/0 via-orange to-orange/0" />

                        <motion.p variants={heroItem} custom={2} className="text-sm sm:text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed mb-6">
                            هل أنت مستعد لبدء رحلة تحولية لمطعمك؟ منيو رقمي احترافي مع طلب عبر واتساب.
                        </motion.p>

                        <motion.div variants={heroItem} custom={3} className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3 py-1 text-[11px] font-medium text-orange mb-5">
                            <span className="size-1.5 rounded-full bg-orange animate-pulse-dot" />
                            أكثر من 500 مطعم يثقون فينا
                        </motion.div>

                        <motion.div variants={heroItem} custom={4} className="flex gap-3 sm:gap-4 justify-center flex-wrap">
                            <Link href="/subscribe">
                                <Button size="lg" className="text-sm sm:text-base">
                                    أنشئ قائمتك مجاناً <ArrowRight className="size-4 sm:size-5 rtl:rotate-180" />
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button variant="outline" size="lg" className="text-sm sm:text-base">
                                    تسجيل الدخول
                                </Button>
                            </Link>
                        </motion.div>
                    </motion.div>
                }
            >
                <div className="flex justify-center sm:px-4 md:px-0">
                    <IPhoneMockup
                        model="15-pro"
                        color="natural-titanium"
                        wallpaper="/hero-phone.png"
                        wallpaperFit="cover"
                        scale={1}
                        className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[320px] lg:max-w-[360px]"
                    />
                </div>
            </ContainerScroll>
        </>
    )
}
