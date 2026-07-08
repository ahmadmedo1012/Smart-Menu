"use client"

import { motion } from "framer-motion"
import { Smartphone, BarChart3, QrCode, Gift, MessageCircle, CheckCircle, TrendingUp } from "lucide-react"
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

function ShimmerBadge() {
	return (
		<motion.span
			className="relative text-[10px] font-bold px-2.5 py-0.5 rounded-sm bg-orange text-white overflow-hidden"
			animate={{ boxShadow: ["0 0 6px oklch(0.55 0.19 45 / 0.3)", "0 0 14px oklch(0.55 0.19 45 / 0.6)", "0 0 6px oklch(0.55 0.19 45 / 0.3)"] }}
			transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
		>
			<motion.span
				className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
				animate={{ x: ["-100%", "200%"] }}
				transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
			/>
			الأكثر طلباً
		</motion.span>
	)
}

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
								? "lg:col-span-3 md:col-span-2 border-orange/30 shadow-lg shadow-orange/5 hover:shadow-xl hover:shadow-orange/10 hover:-translate-y-2 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8"
								: "border-border/50 shadow-sm hover:shadow-lg hover:shadow-orange/5 hover:-translate-y-1"
						}`}
					>
						{i === 0 ? (
							// Featured card — horizontal layout to fill space
							<>
								<div className="relative shrink-0">
									<ShimmerBadge />
									<div className="mt-4 size-14 sm:size-16 rounded-sm bg-orange/15 flex items-center justify-center">
										<feat.icon className="size-7 sm:size-8 text-orange" />
									</div>
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="text-lg sm:text-xl font-bold mb-2">{feat.title}</h3>
									<p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{feat.desc}</p>
									<div className="mt-3 flex items-center gap-4 text-xs text-orange/70">
										<span className="flex items-center gap-1"><TrendingUp className="size-3.5" /> تحميل أسرع ٢٠٠٪</span>
										<span className="flex items-center gap-1">⬆️ تفاعل أعلى ٣٠٪</span>
									</div>
								</div>
							</>
						) : (
							// Regular cards
							<>
								<div className="size-10 sm:size-12 rounded-sm flex items-center justify-center mb-4 transition-all duration-300 bg-orange/10 group-hover:bg-orange/20">
									<feat.icon className="size-5 sm:size-6 text-orange" />
								</div>
								<h3 className="text-base sm:text-lg font-medium mb-2">{feat.title}</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
							</>
						)}
					</motion.div>
				))}
			</div>
		</SectionContainer>
	)
}
