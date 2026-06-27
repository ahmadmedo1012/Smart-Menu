"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const EASE = [0.16, 1, 0.2, 1] as const;

const testimonials = [
	{ name: "أحمد علي", role: "Co-founder", company: "Gardenia", content: "خدمة العملاء متميزة وسريعة. فريق محترف ومتفهم لاحتياجاتنا." },
	{ name: "أماني العربي", role: "Project Manager", company: "Mega Wix", content: "أنصح بالتعامل معهم بدون تردد. سرعة في حل المشكلات وجودة في التصميم." },
	{ name: "إيهاب حمد", role: "CEO Restaurants", company: "UnPan", content: "مصداقية وسرعة. التسليم قبل الموعد المحدد. فريق متكامل ومبدع." },
];

export default function TestimonialsSection() {
	return (
		<section id="reviews" className="relative py-16 sm:py-24 overflow-hidden">
			<div className="absolute inset-0 z-0">
				<img src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80" alt="" className="w-full h-full object-cover opacity-[0.025]" loading="lazy" />
			</div>

			<div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
				<div className="text-center mb-12 sm:mb-16">
					<motion.h2
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6, ease: EASE }}
						className="text-2xl sm:text-3xl md:text-4xl font-medium leading-[1.2]"
					>
						ماذا يقول عملاؤنا
					</motion.h2>
					<div className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-orange/40" />
				</div>

				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
					{testimonials.map((t, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-40px" }}
							transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
							className="rounded-sm bg-card border border-border/50 p-6 sm:p-8 hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 transition-all duration-300"
						>
							<div className="flex gap-0.5 mb-5">
								{[...Array(5)].map((_, j) => <Star key={j} className="size-3.5 sm:size-4 fill-orange text-orange" />)}
							</div>
							<p className="text-sm text-muted-foreground leading-relaxed mb-6">&ldquo;{t.content}&rdquo;</p>
							<div className="flex items-center gap-3 pt-3 border-t border-border/30">
								<div className="size-9 sm:size-10 rounded-full bg-orange flex items-center justify-center text-white text-xs sm:text-sm font-bold shadow-sm">
									{t.name.charAt(0)}
								</div>
								<div>
									<p className="text-sm font-medium">{t.name}</p>
									<p className="text-xs text-muted-foreground">{t.role}، {t.company}</p>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
