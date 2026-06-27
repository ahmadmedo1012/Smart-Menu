"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const EASE = [0.16, 1, 0.2, 1] as const;

export default function FinalCTASection() {
	return (
		<section style={{ willChange: "transform", backfaceVisibility: "hidden" }} className="relative overflow-hidden py-16 sm:py-24">
			<div className="absolute inset-0 z-0">
				<img src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=1600&q=80" alt="" className="w-full h-full object-cover opacity-[0.03]" loading="lazy" />
				<div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
			</div>

			<div className="absolute top-0 start-0 size-64 sm:size-96 -translate-x-1/4 -translate-y-1/4 rounded-full bg-orange/15 blur-[100px] pointer-events-none z-0" />
			<div className="absolute bottom-0 end-0 size-64 sm:size-96 translate-x-1/4 translate-y-1/4 rounded-full bg-orange/10 blur-[100px] pointer-events-none z-0" />

			<div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6 text-center">
				<motion.div
					initial={{ opacity: 0, y: 32 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6, ease: EASE }}
				>
					<span className="inline-flex text-xs font-medium text-orange bg-orange-muted rounded-sm px-2 py-0.5 mb-5">انطلق الآن</span>
					<h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[3.5rem] font-medium leading-[1.1] mb-4 sm:mb-5 text-balance">
						جهّز مطعمك <span className="text-orange">للانطلاق الرقمي</span>
					</h2>
					<p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed mb-10 sm:mb-12 max-w-xl mx-auto">
						انضم إلى <span className="font-bold text-foreground">عشرات المطاعم والمقاهي</span>.
						استقبل الطلبات عبر واتساب - وابدأ في دقائق.
					</p>
					<div className="flex gap-4 justify-center flex-wrap">
						<Link href="/subscribe">
							<Button size="lg">
								ابدأ مجاناً <ArrowLeft className="size-4 sm:size-5" />
							</Button>
						</Link>
						<Link href="/pricing">
							<Button variant="outline" size="lg">
								عرض الخطط
							</Button>
						</Link>
					</div>
					<p className="text-xs text-muted-foreground/60 mt-6">
						مجاناً بدون بطاقة ائتمان - إلغاء في أي وقت - دعم فني متكامل
					</p>
				</motion.div>
			</div>
		</section>
	);
}
