"use client"

import { Smartphone, BarChart3, QrCode, Gift, MessageCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { SectionContainer } from "@/components/ui/SectionContainer"
import { SectionHeader } from "@/components/ui/SectionHeader"
import { ScrollReveal } from "@/components/ui/scroll-reveal"

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
			<ScrollReveal y={20}>
				<SectionHeader align="start" title="كل ما يحتاجه مطعمك في مكان واحد" subtitle="منيو واضح للزبون، طلب مرتب على واتساب، وأدوات تمنحك صورة أفضل عن عملك." />
			</ScrollReveal>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{features.map((feat, i) => {
					// The first feature anchors the grid with a warm gradient + spotlight border
					const isHero = i === 0
					return (
					<ScrollReveal
						key={i}
						y={24}
						delay={i * 60}
					>
						<div
							className={cn(
								"group relative h-full rounded-2xl bg-card border p-5 md:p-6 lg:p-8 shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-300 hover:-translate-y-1.5",
								isHero
									? "border-orange/40 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--card)_86%,var(--orange)),var(--card))] shadow-lg shadow-orange/12"
									: "border-border/40 hover:border-orange/35 hover:shadow-lg hover:shadow-orange/8 hover:bg-[var(--surface-sunken)]/50",
								isHero && "spotlight-border",
							)}
						>
							<div className="relative z-10">
								<div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-orange/12 text-orange ring-1 ring-orange/25 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md">
									<feat.icon className="size-5 sm:size-6" />
								</div>
								<h3 className="text-lg font-medium mb-2">{feat.title}</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
							</div>
						</div>
					</ScrollReveal>
					);
				})}
			</div>
		</SectionContainer>
	)
}
