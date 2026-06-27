"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 40 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-80px" },
	transition: { duration: 0.7, delay: delay * 0.1, ease: EASE },
});

export default function FinalCTASection() {
	return (
		<section className="relative overflow-hidden py-20 border-t border-border/50" dir="rtl">
			<div className="absolute top-0 start-0 size-96 -translate-x-1/4 -translate-y-1/4 rounded-full bg-orange/15 blur-[120px] pointer-events-none" />
			<div className="absolute bottom-0 end-0 size-96 translate-x-1/4 translate-y-1/4 rounded-full bg-orange/10 blur-[120px] pointer-events-none" />

			<div className="relative max-w-[1220px] mx-auto px-4 text-center">
				<motion.div {...fadeUp(0)}>
					<span className="inline-flex text-xs font-medium text-orange bg-orange-muted rounded-sm px-2 py-0.5 mb-6">
						انطلق الآن
					</span>
					<h2 className="text-3xl md:text-5xl lg:text-[3.25rem] font-medium leading-[1.1] mb-5 text-balance">
						جهّز مطعمك
						<br />
						<span className="text-orange">للانطلاق الرقمي</span>
					</h2>
					<p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-12 max-w-xl mx-auto">
						انضم إلى{" "}
						<span className="font-bold">عشرات المطاعم والمقاهي</span>
						. استقبل الطلبات عبر واتساب - وابدأ في دقائق.
					</p>
					<div className="flex gap-4 justify-center flex-wrap">
						<Link href="/subscribe">
							<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
								<Button size="lg" className="px-10 h-14 text-base shadow-lg shadow-orange/20">
									ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
								</Button>
							</motion.div>
						</Link>
						<Link href="/pricing">
							<Button variant="outline" size="lg" className="px-10 h-14 border-2 text-base">
								عرض الخطط
							</Button>
						</Link>
					</div>
					<p className="text-xs text-muted-foreground/60 mt-6">
						مجاناً بدون بطاقة ائتمان • إلغاء في أي وقت • دعم فني متكامل
					</p>
				</motion.div>
			</div>
		</section>
	);
}
