"use client";

import { motion } from "framer-motion";
import { Smartphone, BarChart3, Shield, QrCode, Gift, MessageCircle, Check } from "lucide-react";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 40 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-80px" },
	transition: { duration: 0.7, delay: delay * 0.1, ease: EASE },
});

const features = [
	{
		title: "سرعة و سلاسة",
		icon: Smartphone,
		desc: "تجربة تصفح سريعة وسلسة على جميع الأجهزة",
	},
	{
		title: "طرق طلب متعددة",
		icon: MessageCircle,
		desc: "واتساب - استلام - توصيل - حجز وانتظار",
	},
	{
		title: "تسجيل العملاء",
		icon: QrCode,
		desc: "تسجيل دخول العملاء برقم الجوال بخطوة واحدة",
	},
	{
		title: "تحكم كامل",
		icon: BarChart3,
		desc: "لوحة تحكم باللغة العربية — تعديل وإدارة بسهولة",
	},
	{
		title: "QR كود مخصص",
		icon: QrCode,
		desc: "QR مخصص بألوان وشعار مطعمك",
	},
	{
		title: "برنامج ولاء",
		icon: Gift,
		desc: "برنامج ولاء ومكافآت لعملائك الأوفياء",
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
				<div className="grid md:grid-cols-3 gap-6 stagger-children">
					{features.map((feat, i) => (
						<motion.div
							key={i}
							{...fadeUp(i + 2)}
							className="rounded-md bg-card border border-border/50 p-8 shadow-sm hover:border-orange/30 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-orange/5 transition-all duration-300"
						>
							<div className="size-12 rounded-md bg-orange/10 backdrop-blur-sm flex items-center justify-center mb-4">
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
