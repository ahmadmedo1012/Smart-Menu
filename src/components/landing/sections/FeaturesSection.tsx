"use client"

import { motion } from "framer-motion"
import { Smartphone, BarChart3, QrCode, Gift, MessageCircle, CheckCircle } from "lucide-react"
import { springDefault, springSnappy } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"

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
		<SectionContainer>
			<SectionHeader eyebrow="إليك ما يمكنك تحقيقه معنا" title="ميزات متكاملة لمطعمك" />

			<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
				{features.map((feat, i) => (
					<motion.div
						key={i}
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: false, margin: "-60px" }}
						transition={{ ...springDefault, delay: i * 0.06 }}
						whileHover={{ y: -5, transition: springSnappy }}
						className={`group rounded-sm bg-card border p-4 md:p-6 lg:p-8 transition-all duration-300 ${
							i === 0
								? "lg:col-span-3 md:col-span-2 border-orange/30 shadow-lg shadow-orange/5 hover:shadow-xl hover:shadow-orange/10 hover:-translate-y-2"
								: "border-border/50 shadow-sm hover:shadow-lg hover:shadow-orange/5 hover:-translate-y-1"
						}`}
					>
						<div className="relative">
							{i === 0 && (
								<span className="absolute -top-3 -end-3 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-orange text-white">
									الأكثر طلباً
								</span>
							)}
							<div className={`size-10 sm:size-12 rounded-sm flex items-center justify-center mb-4 transition-all duration-300 ${
								i === 0 ? 'bg-orange/20 size-12 sm:size-14' : 'bg-orange/10 group-hover:bg-orange/20'
							}`}>
								<feat.icon className={`size-5 sm:size-6 text-orange`} />
							</div>
						</div>
						<h3 className="text-base sm:text-lg font-medium mb-2">{feat.title}</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
					</motion.div>
				))}
			</div>
		</SectionContainer>
	)
}
