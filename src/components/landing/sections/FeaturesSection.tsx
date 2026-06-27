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
		items: ["الحجز و الانتظار", "خاصية استدعاء النادل", "الاستلام في وقت معين", "الاستلام بالسيارة أو بالفرع", "الطلبات المحلية", "طلبات التوصيل"],
	},
	{
		title: "تحكم كامل وبكل سهولة",
		icon: BarChart3,
		items: ["إمكانية الإدارة من أي مكان", "تقليل الأخطاء وتبسيط عملية الطلب", "لوحة تحكم بسيطة وباللغة العربية", "مطعمك مع عميلك في كل مكان", "دعم طلبات الواتساب", "تسجيل العملاء من خلال رقم الجوال"],
	},
	{
		title: "حل متكامل لعملاء سعداء",
		icon: Shield,
		items: ["التحكم في الضريبة", "الربط مع وسائل التواصل المختلفة", "انتشر على نطاق أوسع على محركات البحث", "إضافة الموظفين مع تحديد الصلاحيات", "تحكم كامل بدون تنزيل تطبيقات", "العروض والكوبونات"],
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
						<motion.div key={i} {...fadeUp(i + 2)} className="rounded-md bg-card border border-border p-8 hover:border-orange/30 transition-all duration-300">
							<div className="size-12 rounded-md bg-orange-muted flex items-center justify-center mb-4">
								<feat.icon className="size-6 text-orange" />
							</div>
							<h3 className="text-xl font-medium mb-4">{feat.title}</h3>
							<ul className="space-y-3">
								{feat.items.map((item, j) => (
									<li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground">
										<Check className="size-4 text-orange mt-0.5 shrink-0" />
										{item}
									</li>
								))}
							</ul>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
