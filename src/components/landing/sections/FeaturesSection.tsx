"use client"

import { motion } from "motion/react"
import { Smartphone, BarChart3, QrCode, Gift, MessageCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { springDefault, springSnappy } from "@/lib/motion"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"

const features = [
	{ title: "سرعة وسلاسة", icon: Smartphone, desc: "تجربة تصفح سريعة وسلسة على جميع الأجهزة" },
	{ title: "طرق طلب متعددة", icon: MessageCircle, desc: "واتساب · استلام · توصيل · حجز وانتظار" },
	{ title: "تسجيل العملاء", icon: CheckCircle, desc: "تسجيل دخول العملاء برقم الجوال بخطوة واحدة" },
	{ title: "تحكم كامل", icon: BarChart3, desc: "لوحة تحكم باللغة العربية · تعديل وإدارة بسهولة" },
	{ title: "QR كود مخصص", icon: QrCode, desc: "QR مخصص بألوان وشعار مطعمك" },
	{ title: "برنامج ولاء", icon: Gift, desc: "برنامج ولاء ومكافآت لعملائك الأوفياء" },
]

export function FeaturesSection() {
	return (
		<SectionContainer tone="alt">
			<SectionHeader align="start" title="كل ما يحتاجه مطعمك في مكان واحد" subtitle="منيو واضح للزبون، طلب مرتب على واتساب، وأدوات تمنحك صورة أفضل عن عملك." />

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{features.map((feat, i) => {
					// The first feature anchors the grid without hiding its content behind a mask.
					const isHero = i === 0;
					return (
					<motion.div
						key={i}
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-60px" }}
						transition={{ ...springDefault, delay: i * 0.06 }}
						whileHover={{ y: -5, transition: springSnappy }}
						className={cn(
							"group relative rounded-xl bg-card border p-5 md:p-6 lg:p-8 shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-300",
							isHero
								? "border-orange/35 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--card)_88%,var(--orange)),var(--card))] shadow-md shadow-orange/10"
								: "border-border/50 hover:border-orange/30 hover:shadow-md hover:bg-[var(--surface-sunken)]/50",
							isHero && "spotlight-border",
						)}
					>
						<div className="relative z-10">
							<div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-orange/12 text-orange ring-1 ring-orange/20 transition-transform duration-300 group-hover:scale-105">
								<feat.icon className="size-5 sm:size-6" />
							</div>
							<h3 className="text-lg font-medium mb-2">{feat.title}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
						</div>
					</motion.div>
					);
				})}
			</div>
		</SectionContainer>
	)
}
