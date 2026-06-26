"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Smartphone, MessageCircle, QrCode, BarChart3, Gift, Shield, Star, ChevronDown, Quote } from "lucide-react";
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

const FAQ_ITEMS = [
	{ q: "كيف أعمل منيو إلكتروني؟", a: "ببساطة — سجل مطعمك، أضف أصنافك وفئاتك، ثم شارك الرابط أو اطبع QR code. المنيو جاهز في دقائق." },
	{ q: "ما فائدة المنيو الإلكتروني؟", a: "استغني عن طباعة المنيو. حدّث أسعارك وأصنافك فوراً. استقبل الطلبات عبر واتساب. حلِّل طلباتك. ووفّر وقتك وجهدك." },
	{ q: "هل يمكنني التعديل على المنيو دون التأثير على الباركود؟", a: "نعم. أي تعديل يظهر فوراً. الباركود يبقى كما هو — يشير دائماً إلى أحدث نسخة من منيو." },
	{ q: "هل يدعم المنيو الطلب عبر واتساب؟", a: "نعم. أول منصة عربية تدعم إرسال الطلبات مباشرة إلى واتساب المطعم مع تفاصيل كاملة." },
	{ q: "هل المنيو الإلكتروني للمطاعم فقط؟", a: "لا. يناسب المقاهي والمخابز والمطاعم السيارة والأسر المنتجة ومراكز التجميل والفنادق." },
	{ q: "هل أستطيع تصميم QR code خاص بي؟", a: "نعم. نوفر QR code مخصص بألوان وشعار مطعمك. يمكنك طباعته على الطاولات والفواتير والمواد الدعائية." },
	{ q: "هل يمكن الوصول للمنيو عبر جوجل؟", a: "نعم. المنيو متاح عبر رابط مباشر يمكن فهرسته في محركات البحث." },
	{ q: "هل يمكنني الحصول على باقة مخصصة؟", a: "نعم. نوفر باقات مخصصة حسب حجم مطعمك واحتياجاتك. تواصل معنا." },
];

const PARTNER_LOGOS = [
	{ name: "مقهى الواحة", emoji: "☕" },
	{ name: "مطعم الأصيل", emoji: "🥘" },
	{ name: "بيتزا روما", emoji: "🍕" },
	{ name: "سوشي بار", emoji: "🍣" },
	{ name: "مشاوي لبنان", emoji: "🥙" },
	{ name: "حلويات مكة", emoji: "🍰" },
	{ name: "كافيه رايق", emoji: "🧋" },
	{ name: "مطعم البحر", emoji: "🐟" },
	{ name: "فطائر الزعيم", emoji: "🥟" },
	{ name: "عصائر طازة", emoji: "🧃" },
	{ name: "مقهى الواحة", emoji: "☕" },
	{ name: "مطعم الأصيل", emoji: "🥘" },
];

export function FAQSection() {
	return (
		<section className="relative py-20 bg-white" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="max-w-3xl mx-auto">
					<div className="text-center mb-12">
						<motion.span {...fadeUp(0)} className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-orange border border-orange/20 rounded-full mb-6">
							أسئلة شائعة
						</motion.span>
						<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl font-medium leading-[1.2] text-[#1f2124] mb-2">
							إجابات لكل استفساراتك
						</motion.h2>
					</div>
					<div className="space-y-3">
						{FAQ_ITEMS.map((faq, i) => (
							<motion.details
								key={i}
								{...fadeUp(i * 0.5)}
								className="group rounded-[6px] border border-gray-200 bg-white open:border-orange/30 open:shadow-sm transition-all duration-300 overflow-hidden"
							>
								<summary className="flex items-center justify-between cursor-pointer text-base font-medium list-none px-5 py-4 text-[#1f2124] hover:text-orange transition-colors [&::-webkit-details-marker]:hidden">
									{faq.q}
									<ChevronDown className="size-4 text-orange shrink-0 group-open:rotate-180 transition-transform duration-300" />
								</summary>
								<div className="px-5 pb-4">
									<p className="text-sm text-[#8A8A93] leading-relaxed">{faq.a}</p>
								</div>
							</motion.details>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

export function TestimonialsSection() {
	const testimonials = [
		{ name: "أحمد المبروك", role: "صاحب مقهى الواحة", content: "منذ استخدام الربط الذكي، زادت طلباتنا عبر واتساب. الزبائن صاروا يطلبون مباشرة من المنيو دون الاتصال بنا.", rating: 5 },
		{ name: "سارة التومي", role: "مديرة مطعم الأصيل", content: "وفرت لنا المنصة وقتاً وجهداً. تحديث المنيو يتم لحظياً والطلبات تصل مرتبة. أنصح بها كل مطعم.", rating: 5 },
		{ name: "عمر بن عاشور", role: "صاحب بيتزا روما", content: "نظام الولاء والنقاط جعل الزبائن يعودون باستمرار. زيادة واضحة في المبيعات الشهرية.", rating: 5 },
	];

	return (
		<section className="relative py-20 bg-[#111013]">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-12">
					<motion.span {...fadeUp(0)} className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-orange border border-orange/20 rounded-full mb-6">
						ماذا يقول العملاء
					</motion.span>
					<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl font-medium leading-[1.2] text-white mb-2">
						شكراً لعملائنا
					</motion.h2>
				</div>
				<div className="grid md:grid-cols-3 gap-6">
					{testimonials.map((t, i) => (
						<motion.div key={i} {...fadeUp(i + 2)} className="relative rounded-[6px] bg-white/5 border border-white/10 p-8 hover:border-orange/30 transition-all duration-300">
							<div className="absolute -top-3 -right-3 size-8 rounded-full bg-orange flex items-center justify-center">
								<Quote className="size-4 text-white" />
							</div>
							<div className="flex gap-1 mb-4">
								{[...Array(t.rating)].map((_, j) => (
									<Star key={j} className="size-4 fill-orange text-orange" />
								))}
							</div>
							<p className="text-sm text-[#c0c0c0] leading-relaxed mb-6">
								{t.content}
							</p>
							<div className="flex items-center gap-3">
								<div className="size-10 rounded-full bg-orange/20 flex items-center justify-center text-orange text-sm font-bold">
									{t.name.charAt(0)}
								</div>
								<div>
									<p className="text-sm font-medium text-white">{t.name}</p>
									<p className="text-xs text-[#8A8A93]">{t.role}</p>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

export function LogosSection() {
	return (
		<section className="relative py-16 bg-white overflow-hidden">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-10">
					<motion.span {...fadeUp(0)} className="inline-block px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase text-orange border border-orange/20 rounded-full mb-4">
						عملاؤنا
					</motion.span>
					<motion.h2 {...fadeUp(1)} className="text-2xl md:text-3xl font-medium text-[#1f2124]">
						بعض العملاء والمشاريع
					</motion.h2>
				</div>
				<div className="relative">
					<motion.div className="flex gap-6 overflow-hidden" {...fadeUp(2)}>
						<div className="flex gap-6 animate-marquee">
							{PARTNER_LOGOS.map((logo, i) => (
								<div key={i} className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-[6px] bg-gray-50 border border-gray-100">
									<span className="text-xl">{logo.emoji}</span>
									<span className="text-sm font-medium text-[#1f2124]">{logo.name}</span>
								</div>
							))}
						</div>
					</motion.div>
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
