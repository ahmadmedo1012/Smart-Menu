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
		<section id="reviews" className="relative py-24 overflow-hidden" dir="rtl">
			{/* Background */}
			<div className="absolute inset-0 z-0">
				<img src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1600&q=80" alt="" className="w-full h-full object-cover opacity-[0.03]" loading="lazy" />
			</div>

			<div className="relative z-10 max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-12">
					<motion.h2
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.7, ease: EASE }}
						className="text-3xl md:text-4xl font-medium leading-[1.2]"
					>
						ماذا يقول عملاؤنا
					</motion.h2>
				</div>
				<div className="grid md:grid-cols-3 gap-6">
					{testimonials.map((t, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, x: i === 0 ? -30 : i === 2 ? 30 : 0, y: 20 }}
							whileInView={{ opacity: 1, x: 0, y: 0 }}
							viewport={{ once: true, margin: "-40px" }}
							transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
							className="rounded-md bg-card border border-border/50 p-8 shadow-sm hover:border-orange/30 hover:shadow-lg hover:shadow-orange/5 transition-all duration-300"
						>
							<div className="flex gap-0.5 mb-4">
								{[...Array(5)].map((_, j) => <Star key={j} className="size-4 fill-orange text-orange" />)}
							</div>
							<p className="text-sm text-muted-foreground leading-relaxed mb-6">
								{t.content}
							</p>
							<div className="flex items-center gap-3">
								<div className="size-10 rounded-full bg-orange flex items-center justify-center text-white text-sm font-bold shadow-sm">
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
