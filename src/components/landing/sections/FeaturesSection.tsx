"use client";

import { motion } from "framer-motion";
import { Smartphone, BarChart3, QrCode, Gift, MessageCircle, CheckCircle } from "lucide-react";

const EASE = [0.16, 1, 0.2, 1] as const;

const features = [
	{ title: "سرعة و سلاسة", icon: Smartphone, desc: "تجربة تصفح سريعة وسلسة على جميع الأجهزة" },
	{ title: "طرق طلب متعددة", icon: MessageCircle, desc: "واتساب - استلام - توصيل - حجز وانتظار" },
	{ title: "تسجيل العملاء", icon: CheckCircle, desc: "تسجيل دخول العملاء برقم الجوال بخطوة واحدة" },
	{ title: "تحكم كامل", icon: BarChart3, desc: "لوحة تحكم باللغة العربية - تعديل وإدارة بسهولة" },
	{ title: "QR كود مخصص", icon: QrCode, desc: "QR مخصص بألوان وشعار مطعمك" },
	{ title: "برنامج ولاء", icon: Gift, desc: "برنامج ولاء ومكافآت لعملائك الأوفياء" },
];

export default function FeaturesSection() {
	return (
		<section style={{ willChange: "transform", backfaceVisibility: "hidden" }} className="relative py-12 sm:py-16 overflow-hidden">
			<div className="absolute inset-0 z-0">
				<img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80" alt="" className="w-full h-full object-cover opacity-[0.03]" loading="lazy" />
			</div>

			<div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
				<div className="text-center mb-12 sm:mb-16">
					<span className="inline-flex text-xs font-medium text-orange bg-orange-muted rounded-sm px-2 py-0.5 mb-4">إليك ما يمكنك تحقيقه معنا</span>
					<motion.h2
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6, ease: EASE }}
						className="text-2xl sm:text-3xl md:text-4xl font-medium leading-[1.2]"
					>
						ميزات متكاملة لمطعمك
					</motion.h2>
					<div className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-orange/40" />
				</div>

				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
					{features.map((feat, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, y: 24 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-40px" }}
							transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
							className="group rounded-sm bg-card border border-border/50 p-6 sm:p-8 hover:border-orange/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange/5 transition-all duration-300"
						>
							<div className="size-10 sm:size-12 rounded-sm bg-orange/10 flex items-center justify-center mb-4 group-hover:bg-orange/20 transition-colors duration-300">
								<feat.icon className="size-5 sm:size-6 text-orange" />
							</div>
							<h3 className="text-base sm:text-lg font-medium mb-2">{feat.title}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
