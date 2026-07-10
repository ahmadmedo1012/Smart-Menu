"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { IPhoneMockup } from "@/components/ui/iphone-mockup"

export default function HeroSection() {
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
                    <>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] text-balance max-w-4xl mx-auto">
                            <span className="block">
                                منيو رقمي لمطعمك
                            </span>
                            <span className="block"> </span>
                            <span className="block">
                                <span className="text-orange">الطلبات تصل</span> على واتساب
                            </span>
                        </h1>

                        <div className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-gradient-to-r from-orange/0 via-orange to-orange/0" />

                        <p className="text-sm sm:text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed mb-6">
                            هل أنت مستعد لبدء رحلة تحولية لمطعمك؟ منيو رقمي احترافي مع طلب عبر واتساب.
                        </p>

                        <div className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3 py-1 text-[11px] font-medium text-orange mb-5">
                            <span className="size-1.5 rounded-full bg-orange animate-pulse-dot" />
                            أكثر من 500 مطعم يثقون فينا
                        </div>

                        <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
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
                        </div>
                    </>
                }
            >
                <div className="flex justify-center sm:px-4 md:px-0">
                    <IPhoneMockup
                        model="15-pro"
                        color="natural-titanium"
                        wallpaper="/main21.png"
                        wallpaperFit="cover"
                        scale={1}
                        className="w-full max-w-[280px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[417px]"
                    />
                </div>
            </ContainerScroll>
        </>
    )
}
