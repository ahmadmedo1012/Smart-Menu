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
		<section className="relative py-24 overflow-hidden" dir="rtl">
			{/* Background image */}
			<div className="absolute inset-0 z-0">
				<img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80" alt="" className="w-full h-full object-cover opacity-[0.04]" loading="lazy" />
			</div>

			<div className="relative z-10 max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-14">
					<span className="inline-flex text-xs font-medium text-orange bg-orange-muted rounded-sm px-2 py-0.5 mb-4">إليك ما يمكنك تحقيقه معنا</span>
					<motion.h2
						initial={{ opacity: 0, y: 30 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.7, ease: EASE }}
						className="text-3xl md:text-4xl font-medium leading-[1.2]"
					>
						ميزات متكاملة لمطعمك
					</motion.h2>
				</div>
				<div className="grid md:grid-cols-3 gap-5">
					{features.map((feat, i) => (
						<motion.div
							key={i}
							initial={{ opacity: 0, y: i % 2 === 0 ? 30 : 50 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-40px" }}
							transition={{ duration: 0.6, delay: i * 0.08, ease: EASE }}
							className="group rounded-md bg-card border border-border/50 p-6 md:p-8 shadow-sm hover:border-orange/30 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-orange/5 transition-all duration-300"
						>
							<div className="size-12 rounded-md bg-orange/10 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:bg-orange/20 transition-colors">
								<feat.icon className="size-6 text-orange" />
							</div>
							<h3 className="text-lg font-medium mb-2">{feat.title}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
