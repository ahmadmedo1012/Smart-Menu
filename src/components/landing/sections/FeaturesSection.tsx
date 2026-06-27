"use client";

import { motion } from "framer-motion";
import { Smartphone, BarChart3, Shield, Check } from "lucide-react";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 40 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-80px" },
	transition: { duration: 0.7, delay: delay * 0.1, ease: EASE },
});

const features = [
	{
		title: "طرق طلب مختلفة",
		icon: Smartphone,
		items: ["الحجز و الانتظار", "خاصية استدعاء النادل", "الاستلام في وقت معين", "الاستلام بالسيارة أو بالفرع"],
	},
	{
		title: "تحكم كامل وبكل سهولة",
		icon: BarChart3,
		items: ["لوحة تحكم باللغة العربية", "مطعمك مع عميلك في كل مكان", "دعم طلبات الواتساب", "تسجيل العملاء من خلال رقم الجوال"],
	},
];

export default function FeaturesSection() {
	return (
		<section className="relative py-20" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-14">
					<span className="inline-flex text-xs font-medium text-orange bg-orange-muted rounded-sm px-2 py-0.5 mb-4">
						إليك ما يمكنك تحقيقه معنا
					</span>
					<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl font-medium leading-[1.2]">
						ميزات متكاملة لمطعمك
					</motion.h2>
				</div>
				{/* 2-column zigzag — avoids taste-skill 3-equal-card ban */}
				<div className="space-y-6">
					{features.map((feat, i) => (
						<motion.div
							key={i}
							{...fadeUp(i + 2)}
							className="grid md:grid-cols-2 gap-8 items-start rounded-md bg-card border border-border p-8 hover:border-orange/30 transition-all duration-300"
							style={{ direction: i % 2 === 0 ? "rtl" : "ltr" }}
						>
							<div className="flex items-start gap-4" style={{ direction: "rtl" }}>
								<div className="size-12 rounded-md bg-orange-muted flex items-center justify-center shrink-0">
									<feat.icon className="size-6 text-orange" />
								</div>
								<div>
									<h3 className="text-xl font-medium mb-3">{feat.title}</h3>
									<ul className="space-y-3">
										{feat.items.map((item, j) => (
											<li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground">
												<Check className="size-4 text-orange mt-0.5 shrink-0" />
												{item}
											</li>
										))}
									</ul>
								</div>
							</div>
							<div className="rounded-md bg-gradient-to-br from-orange/[0.03] to-transparent border border-border/50 p-6 flex items-center justify-center min-h-[120px]">
								<p className="text-sm text-muted-foreground/60 text-center">
									{i === 0 ? "واجهة طلب ذكية تدعم جميع قنوات البيع" : "إدارة متكاملة من لوحة تحكم واحدة"}
								</p>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
