"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { OptimizedImage } from "@/components/ui/OptimizedImage"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import { springGentle, springDefault } from "@/lib/motion"

export default function HeroSection() {
    return (
        <>
            {/* Ambient glow — sits behind the scroll container */}
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
                        <motion.h1
                            initial="hidden"
                            animate="visible"
                            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.15] text-balance max-w-4xl mx-auto"
                        >
                            <motion.span
                                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: springGentle } }}
                                className="block"
                            >
                                منيو رقمي لمطعمك
                            </motion.span>
                            <motion.span
                                variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: springGentle } }}
                                className="block"
                            >
                                <span className="text-orange">الطلبات تصل</span> على واتساب
                            </motion.span>
                        </motion.h1>

                        <div className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-gradient-to-r from-orange/0 via-orange to-orange/0" />

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...springDefault, delay: 0.15 }}
                            className="text-sm sm:text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed mb-6"
                        >
                            هل أنت مستعد لبدء رحلة تحولية لمطعمك؟ منيو رقمي احترافي مع طلب عبر واتساب.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...springDefault, delay: 0.2 }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-orange/20 bg-orange/5 px-3 py-1 text-[11px] font-medium text-orange mb-5"
                        >
                            <span className="size-1.5 rounded-full bg-orange animate-pulse-dot" />
                            أكثر من 500 مطعم يثقون فينا
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ ...springDefault, delay: 0.3 }}
                            className="flex gap-3 sm:gap-4 justify-center flex-wrap"
                        >
                            <motion.div whileHover={{ scale: 1.05, x: 5 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
                                <Link href="/subscribe">
                                    <Button size="lg" className="text-sm sm:text-base">
                                        أنشئ قائمتك مجاناً <ArrowRight className="size-4 sm:size-5 rtl:rotate-180" />
                                    </Button>
                                </Link>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                                <Link href="/login">
                                    <Button variant="outline" size="lg" className="text-sm sm:text-base">
                                        تسجيل الدخول
                                    </Button>
                                </Link>
                            </motion.div>
                        </motion.div>
                    </>
                }
            >
                <OptimizedImage
                    src="/main21.png"
                    alt="واجهة المنيو الرقمي"
                    className="w-full"
                    imageClassName="object-cover w-full"
                    skeleton={false}
                    priority
                />
            </ContainerScroll>
        </>
    )
}
