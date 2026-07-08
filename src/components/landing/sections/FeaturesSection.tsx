"use client"

import { motion } from "framer-motion"
import { Smartphone, BarChart3, QrCode, Gift, MessageCircle, CheckCircle } from "lucide-react"
import { springGentle, springDefault, springSnappy } from "@/lib/motion"
import { Eyebrow } from "@/components/ui/Eyebrow"

const features = [
	{ title: "سرعة و سلاسة", icon: Smartphone, desc: "تجربة تصفح سريعة وسلسة على جميع الأجهزة" },
	{ title: "طرق طلب متعددة", icon: MessageCircle, desc: "واتساب - استلام - توصيل - حجز وانتظار" },
	{ title: "تسجيل العملاء", icon: CheckCircle, desc: "تسجيل دخول العملاء برقم الجوال بخطوة واحدة" },
	{ title: "تحكم كامل", icon: BarChart3, desc: "لوحة تحكم باللغة العربية - تعديل وإدارة بسهولة" },
	{ title: "QR كود مخصص", icon: QrCode, desc: "QR مخصص بألوان وشعار مطعمك" },
	{ title: "برنامج ولاء", icon: Gift, desc: "برنامج ولاء ومكافآت لعملائك الأوفياء" },
]

export default function FeaturesSection() {
	return (
		<section style={{ willChange: "transform", backfaceVisibility: "hidden" }} className="relative py-12 sm:py-16 overflow-hidden">
			<div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-transparent to-background">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--color-background)_100%)] pointer-events-none" />
			</div>

			<div className="relative z-10 max-w-[1220px] mx-auto px-4 sm:px-6">
				<div className="text-center mb-12 sm:mb-16">
					<Eyebrow>إليك ما يمكنك تحقيقه معنا</Eyebrow>
					<motion.h2
						initial={{ opacity: 0, y: 24, scale: 0.96 }}
						whileInView={{ opacity: 1, y: 0, scale: 1 }}
						viewport={{ once: true }}
						transition={springGentle}
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
							transition={{ ...springDefault, delay: i * 0.06 }}
							whileHover={{ y: -5, transition: springSnappy }}
							className={`group rounded-sm bg-card border border-border/50 p-4 md:p-6 lg:p-8 transition-colors duration-300 ${i === 0 ? "lg:col-span-2 " : ""}${i % 2 === 0 ? "hover:border-gold/30" : "hover:border-orange/30"}`}
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
	)
}
