"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 40 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-80px" },
	transition: { duration: 0.7, delay: delay * 0.1, ease: EASE },
});

const testimonials = [
	{ name: "أحمد علي", role: "Co-founder", company: "Gardenia", tag: "خدمة العملاء", content: "خدمة العملاء متميزة وسريعة. فريق محترف ومتفهم لاحتياجاتنا." },
	{ name: "أماني العربي", role: "Project Manager", company: "Mega Wix", tag: "جودة التصميم", content: "أنصح بالتعامل معهم بدون تردد. سرعة في حل المشكلات وجودة في التصميم." },
	{ name: "إيهاب حمد", role: "CEO Restaurants", company: "UnPan", tag: "تصميم المواقع", content: "مصداقية وسرعة. التسليم قبل الموعد المحدد. فريق متكامل ومبدع." },
];

export default function TestimonialsSection() {
	return (
		<section id="reviews" className="relative py-20" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-12">
					<span className="inline-flex text-xs font-medium text-orange bg-orange-muted rounded-sm px-2 py-0.5 mb-4">
						ماذا يقول العملاء
					</span>
					<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl font-medium leading-[1.2]">
						شكرا لعملائنا
					</motion.h2>
				</div>
				<div className="grid md:grid-cols-3 gap-6">
					{testimonials.map((t, i) => (
						<motion.div key={i} {...fadeUp(i + 2)} className="rounded-md bg-card border border-border/50 p-8 shadow-sm hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 transition-all duration-300">
							<span className="inline-flex text-xs font-medium text-orange bg-orange-muted rounded-sm px-2 py-0.5 mb-4">
								{t.tag}
							</span>
							<div className="flex gap-0.5 mb-4">
								{[...Array(5)].map((_, j) => (
									<Star key={j} className="size-4 fill-orange text-orange" />
								))}
							</div>
							<p className="text-sm text-muted-foreground leading-relaxed mb-6">
								{t.content}
							</p>
							<div className="flex items-center gap-3">
								<div className="size-10 rounded-full bg-orange-muted flex items-center justify-center text-orange text-sm font-bold">
									{t.name.charAt(0)}
								</div>
								<div>
									<p className="text-sm font-medium">{t.name}</p>
									<p className="text-xs text-muted-foreground">{t.role}, {t.company}</p>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
