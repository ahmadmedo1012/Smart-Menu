"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Smartphone, MessageCircle, QrCode, BarChart3, Gift, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneMockup } from "./PhoneMockup";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 40 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-80px" },
	transition: { duration: 0.7, delay: delay * 0.1, ease: EASE },
});

const FEATURES = [
	{ icon: Smartphone, title: "منيو رقمي تفاعلي", desc: "قائمة طعام رقمية مع صور وأسعار وتفاصيل. محدثة بشكل لحظي دون طباعة." },
	{ icon: MessageCircle, title: "طلب عبر واتساب", desc: "يصل الطلب مباشرة إلى واتساب المطعم مع تفاصيل كاملة." },
	{ icon: QrCode, title: "QR كود مخصص", desc: "رمز QR خاص لمطعمك للطباعة على الطاولات والفواتير." },
	{ icon: BarChart3, title: "إحصائيات وتحليلات", desc: "تقارير مفصلة عن الطلبات والأصناف الأكثر طلباً." },
	{ icon: Gift, title: "برنامج ولاء", desc: "نظام نقاط ومكافآت يحفز الزبائن على العودة." },
	{ icon: Shield, title: "تحكم كامل", desc: "لوحة تحكم متكاملة لإدارة المنيو والطلبات." },
];

const STEPS = [
	{ number: "01", title: "سجل مطعمك", desc: "أدخل بيانات مطعمك في دقائق وأنشئ حساباً مجاناً" },
	{ number: "02", title: "أضف المنيو", desc: "أضف الأصناف والفئات والأسعار والصور بسهولة" },
	{ number: "03", title: "شارك الرابط", desc: "شارك رابط المنيو مع زبائنك وابدأ باستقبال الطلبات" },
];

export function PhoneShowcaseSection() {
	return (
		<section className="relative overflow-hidden py-20 bg-background">
			<div className="absolute inset-0 bg-gradient-to-b from-background via-orange/[0.01] to-background pointer-events-none" />
			<div className="relative max-w-[1220px] mx-auto px-4">
				<div className="grid lg:grid-cols-2 gap-12 items-center">
					<div className="order-2 lg:order-1 flex justify-center">
						<PhoneMockup className="w-full max-w-[280px]" />
					</div>
					<div className="order-1 lg:order-2">
						<motion.span {...fadeUp(0)} className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-orange border border-orange/20 rounded-full mb-6">
							المنيو الرقمي
						</motion.span>
						<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl lg:text-[2.75rem] font-medium leading-[1.2] text-white mb-4">
							منيو تفاعلي<br />بلمسة احترافية
						</motion.h2>
						<motion.p {...fadeUp(2)} className="text-muted-foreground text-base leading-relaxed max-w-md">
							صمم منيو يعكس هوية مطعمك. أضف صور الأطباق والأسعار والتفاصيل — وحدثها متى تشاء بدون تكاليف طباعة.
						</motion.p>
					</div>
				</div>
			</div>
		</section>
	);
}

export function StatsSection({ stats }: { stats: { totalRestaurants: number; totalUsers: number } }) {
	return (
		<section className="relative py-20 bg-white">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="grid md:grid-cols-3 gap-8 text-center">
					{[
						{ value: stats.totalRestaurants || 0, label: "مطعم ومقهى", suffix: "+" },
						{ value: stats.totalUsers || 0, label: "مستخدم نشط", suffix: "+" },
						{ value: 100, label: "رضا العملاء", suffix: "%" },
					].map((stat, i) => (
						<motion.div key={i} {...fadeUp(i)} className="py-8">
							<div className="text-5xl md:text-6xl font-medium text-foreground mb-2">
								<div className="size-1.5 rounded-full bg-orange mx-auto mb-3" />
								{stat.value}{stat.suffix}
							</div>
							<div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

export function HowItWorksSection() {
	return (
		<section className="relative overflow-hidden py-20 bg-background">
			<div className="absolute top-0 left-1/2 -translate-x-1/2 size-[60vmin] rounded-full bg-orange/[0.03] blur-[120px] pointer-events-none" />
			<div className="relative max-w-[1220px] mx-auto px-4 text-center">
				<motion.span {...fadeUp(0)} className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-orange border border-orange/20 rounded-full mb-6">
					كيف تعمل
				</motion.span>
				<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl lg:text-[2.75rem] font-medium leading-[1.2] text-white mb-14">
					تبدأ في ٣ خطوات
				</motion.h2>
				<div className="grid md:grid-cols-3 gap-8">
					{STEPS.map((step, i) => (
						<motion.div key={i} {...fadeUp(i + 2)} className="text-center">
							<div className="size-16 rounded-full bg-orange/10 border border-orange/20 flex items-center justify-center mx-auto mb-4">
								<span className="text-xl font-medium text-orange">{step.number}</span>
							</div>
							<h3 className="text-xl font-medium text-white mb-2">{step.title}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

export function DisplayCards() {
	return (
		<section className="relative py-20 bg-white">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-12">
					<motion.span {...fadeUp(0)} className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-orange border border-orange/20 rounded-full mb-6">
						المميزات
					</motion.span>
					<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl lg:text-[2.75rem] font-medium leading-[1.2] text-foreground mb-4">
						كل ما تحتاجه في منصة واحدة
					</motion.h2>
				</div>
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{FEATURES.map((feat, i) => (
						<motion.div
							key={i}
							{...fadeUp(i)}
							className={cn(
								"p-8 rounded-[6px] border transition-all duration-300",
								i % 2 === 0
									? "bg-background text-white border-white/10 hover:border-orange/40"
									: "bg-white text-foreground border-gray-200 hover:border-orange/40 hover:shadow-md"
							)}
						>
							<div className={cn(
								"size-12 rounded-[6px] flex items-center justify-center mb-4",
								i % 2 === 0 ? "bg-orange/15" : "bg-orange/10"
							)}>
								<feat.icon className={cn("size-6", i % 2 === 0 ? "text-orange" : "text-orange")} />
							</div>
							<h3 className={cn("text-lg font-medium mb-2", i % 2 === 0 ? "text-white" : "text-foreground")}>{feat.title}</h3>
							<p className={cn("text-sm leading-relaxed", i % 2 === 0 ? "text-muted-foreground" : "text-muted-foreground")}>{feat.desc}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

export function CTASection() {
	return (
		<section className="relative overflow-hidden py-20 bg-background">
			{/* Orange glow orbs */}
			<div className="absolute top-0 start-0 size-96 -translate-x-1/4 -translate-y-1/4 rounded-full bg-orange/15 blur-[160px] pointer-events-none" />
			<div className="absolute bottom-0 end-0 size-96 translate-x-1/4 translate-y-1/4 rounded-full bg-orange/10 blur-[160px] pointer-events-none" />

			<div className="relative max-w-[1220px] mx-auto px-4 text-center">
				<motion.div {...fadeUp(0)}>
					<span className="inline-block px-4 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase mb-6 text-orange border border-orange/20 rounded-full">
						انطلق الآن
					</span>
					<h2 className="text-3xl md:text-5xl lg:text-[3.25rem] font-medium leading-[1.1] text-white mb-5 text-balance">
						جهّز مطعمك
						<br />
						<span className="text-orange">للانطلاق الرقمي</span>
					</h2>
					<p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-12 max-w-xl mx-auto">
						انضم إلى{" "}
						<span className="font-bold text-white">عشرات المطاعم والمقاهي</span>
						. استقبل الطلبات عبر واتساب بدون وسيط — وابدأ في دقائق.
					</p>
					<div className="flex gap-4 justify-center flex-wrap">
						<Link href="/subscribe">
							<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
								<Button
									variant="orange"
									size="lg"
									className="px-10 h-14 text-base shadow-xl shadow-orange/20 hover:shadow-2xl hover:shadow-orange/30"
								>
									ابدأ مجاناً <ArrowLeft className="ms-2 size-5" />
								</Button>
							</motion.div>
						</Link>
						<Link href="/pricing">
							<Button variant="orange-outline" size="lg" className="px-10 h-14 border-2 text-base">
								عرض الخطط
							</Button>
						</Link>
					</div>
					<p className="text-xs text-muted-foreground/60 mt-6">
						مجاناً بدون بطاقة ائتمان • إلغاء في أي وقت • دعم فني متكامل
					</p>
				</motion.div>
			</div>
		</section>
	);
}
