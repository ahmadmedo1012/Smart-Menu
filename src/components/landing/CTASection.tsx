"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
	ArrowLeft, MessageCircle, ChevronDown, Star, Quote,
	Smartphone, QrCode, BarChart3, Gift, Shield, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 40 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-80px" },
	transition: { duration: 0.7, delay: delay * 0.1, ease: EASE },
});

/* ── Problem Statement ── */
export function ProblemSection() {
	return (
		<section className="relative py-20 bg-white" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4 text-center">
				<motion.p {...fadeUp(0)} className="text-lg md:text-xl text-[#1f2124] leading-relaxed max-w-3xl mx-auto mb-4">
					في عالم تتحكم فيه التكنولوجيا، ليس كافيًا أن يكون لديك طعام لذيذ
				</motion.p>
				<motion.p {...fadeUp(1)} className="text-base text-[#8A8A93] max-w-2xl mx-auto">
					عملاؤك يبحثون عن تجربة سهلة وسلسة عبر الإنترنت
				</motion.p>
			</div>
		</section>
	);
}

/* ── 3-Column Features Grid (PlanPOS style) ── */
export function FeaturesGridSection() {
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

	return (
		<section className="relative py-20 bg-[#111013]" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-14">
					<span className="inline-flex text-xs font-medium text-orange bg-orange/10 rounded-sm px-2 py-0.5 mb-4">
						إليك ما يمكنك تحقيقه معنا
					</span>
					<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl font-medium leading-[1.2] text-white">
						ميزات متكاملة لمطعمك
					</motion.h2>
				</div>
				<div className="grid md:grid-cols-3 gap-6">
					{features.map((feat, i) => (
						<motion.div key={i} {...fadeUp(i + 2)} className="rounded-md bg-white/5 border border-white/10 p-8 hover:border-orange/30 transition-all duration-300">
							<div className="size-12 rounded-md bg-orange/15 flex items-center justify-center mb-4">
								<feat.icon className="size-6 text-orange" />
							</div>
							<h3 className="text-xl font-medium text-white mb-4">{feat.title}</h3>
							<ul className="space-y-3">
								{feat.items.map((item, j) => (
									<li key={j} className="flex items-start gap-2.5 text-sm text-[#c0c0c0]">
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

/* ── Digital Menu Pitch Section ── */
export function DigitalMenuSection() {
	const points = [
		{ title: "ضمان أفضل الأسعار", desc: "أفضل الأسعار التنافسية في السوق", icon: Shield },
		{ title: "باركود سريع — كفاءة ممتازة", desc: "QR سريع بدون تحميل تطبيقات", icon: QrCode },
		{ title: "تصميم غير تقليدي", desc: "تصميم فريد يعكس هوية مطعمك", icon: Smartphone },
		{ title: "تحكم كامل وبكل سهولة", desc: "تعديل الأصناف والأسعار في أي وقت", icon: BarChart3 },
	];

	return (
		<section className="relative py-20 bg-white" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-12">
					<motion.h2 {...fadeUp(0)} className="text-3xl md:text-4xl font-medium leading-[1.2] text-[#1f2124] mb-4">
						نحن نوفر الحل الأمثل لعمل منيو الكتروني تفاعلي
					</motion.h2>
					<motion.p {...fadeUp(1)} className="text-base text-[#8A8A93] max-w-2xl mx-auto">
						مصمم بشكل جميل لأفضل واجهة مستخدم وتجربة مستخدم. كل ما يتطلبه الأمر لعمل لوحة فنية رقمية
					</motion.p>
				</div>
				<div className="grid md:grid-cols-4 gap-6">
					{points.map((point, i) => (
						<motion.div key={i} {...fadeUp(i + 2)} className="text-center p-6 rounded-md border border-gray-100 hover:border-orange/30 hover:shadow-sm transition-all duration-300">
							<div className="size-12 rounded-full bg-orange/10 flex items-center justify-center mx-auto mb-3">
								<point.icon className="size-6 text-orange" />
							</div>
							<h3 className="text-base font-medium text-[#1f2124] mb-1">{point.title}</h3>
							<p className="text-sm text-[#8A8A93]">{point.desc}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

/* ── Experience Section ── */
export function ExperienceSection() {
	const items = [
		{ icon: Smartphone, title: "سرعة و سلاسة", desc: "تجربة تصفح سريعة وسلسة على جميع الأجهزة" },
		{ icon: QrCode, title: "تسجيل العملاء", desc: "تسجيل دخول العملاء برقم الجوال بخطوة واحدة" },
		{ icon: QrCode, title: "تصميم رمز الاستجابة السريع", desc: "QR مخصص بألوان وشعار مطعمك" },
		{ icon: Shield, title: "دعم غير تلامسي", desc: "طلب ودفع بدون تلامس — آمن وصحي" },
		{ icon: BarChart3, title: "إدارة قوائم الطعام", desc: "إضافة وتعديل الأصناف بسهولة تامة" },
		{ icon: Gift, title: "آراء العملاء", desc: "جمع وتتبع آراء العملاء لتحسين الخدمة" },
	];

	return (
		<section className="relative py-20 bg-[#111013]" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-12">
					<motion.h2 {...fadeUp(0)} className="text-3xl md:text-4xl font-medium leading-[1.2] text-white mb-4">
						قدم تجربة حديثة وآمنة لعملائك
					</motion.h2>
					<motion.p {...fadeUp(1)} className="text-base text-[#c0c0c0] max-w-xl mx-auto mb-8">
						واستمتع بإدارة أكثر سهولة
					</motion.p>
					<motion.div {...fadeUp(2)}>
						<Link href="https://wa.me/218911111111" target="_blank" rel="noopener noreferrer">
							<Button variant="orange" size="lg" className="px-10 h-14 text-base">
								<MessageCircle className="ms-2 size-5" />
								تواصل مباشر واتساب
							</Button>
						</Link>
					</motion.div>
				</div>
				<div className="grid md:grid-cols-3 gap-6">
					{items.map((item, i) => (
						<motion.div key={i} {...fadeUp(i + 3)} className="rounded-md bg-white/5 border border-white/10 p-6 text-center hover:border-orange/30 transition-all duration-300">
							<div className="size-12 rounded-full bg-orange/15 flex items-center justify-center mx-auto mb-3">
								<item.icon className="size-6 text-orange" />
							</div>
							<h3 className="text-base font-medium text-white mb-1">{item.title}</h3>
							<p className="text-sm text-[#c0c0c0]">{item.desc}</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

/* ── Testimonials ── */
export function TestimonialsSection() {
	const testimonials = [
		{ name: "أحمد علي", role: "Co-founder", company: "Gardenia", tag: "خدمة العملاء", content: "خدمة العملاء متميزة وسريعة. فريق محترف ومتفهم لاحتياجاتنا." },
		{ name: "أماني العربي", role: "Project Manager", company: "Mega Wix", tag: "جودة التصميم", content: "أنصح بالتعامل معهم بدون تردد. سرعة في حل المشكلات وجودة في التصميم." },
		{ name: "إيهاب حمد", role: "CEO Restaurants", company: "UnPan", tag: "تصميم المواقع", content: "مصداقية وسرعة. التسليم قبل الموعد المحدد. فريق متكامل ومبدع." },
	];

	return (
		<section id="reviews" className="relative py-20 bg-[#111013]" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-12">
					<span className="inline-flex text-xs font-medium text-orange bg-orange/10 rounded-sm px-2 py-0.5 mb-4">
						ماذا يقول العملاء
					</span>
					<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl font-medium leading-[1.2] text-white">
						شكرا لعملائنا
					</motion.h2>
				</div>
				<div className="grid md:grid-cols-3 gap-6">
					{testimonials.map((t, i) => (
						<motion.div key={i} {...fadeUp(i + 2)} className="rounded-md bg-white/5 border border-white/10 p-8 hover:border-orange/30 transition-all duration-300">
							<span className="inline-flex text-xs font-medium text-orange bg-orange/10 rounded-sm px-2 py-0.5 mb-4">
								{t.tag}
							</span>
							<div className="flex gap-0.5 mb-4">
								{[...Array(5)].map((_, j) => (
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
									<p className="text-xs text-[#8A8A93]">{t.role}, {t.company}</p>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}

/* ── FAQ ── */
const FAQ_ITEMS = [
	{ q: "ازاى اعمل منيو باركود ؟", a: "ببساطة — سجل مطعمك، أضف أصنافك، ثم شارك الرابط أو اطبع QR code. المنيو جاهز في دقائق." },
	{ q: "ما فائدة المنيو الإلكتروني ؟", a: "استغني عن طباعة المنيو. حدّث أسعارك فوراً. استقبل الطلبات عبر واتساب. حلِّل طلباتك. وفر وقتك وجهدك." },
	{ q: "هل يمكنني التعديل على المنيو دون التأثير على الباركود ؟", a: "نعم. أي تعديل يظهر فوراً. الباركود يبقى ثابت — يشير لأحدث نسخة." },
	{ q: "هل يمكن عمل منيو إلكتروني للأسر المنتجة ؟", a: "نعم. المنصة تدير الأسر المنتجة والمشاريع الصغيرة بكل سهولة." },
	{ q: "هل يدعم المنيو تحويل الطلب إلى الواتساب ؟", a: "نعم. أول منصة عربية تدعم إرسال الطلبات مباشرة إلى واتساب المطعم." },
	{ q: "هل المنيو الإلكتروني فقط للمطاعم ؟", a: "لا. يناسب المقاهي والمطاعم والفنادق والفود ترك ومراكز التجميل والمستشفيات والشركات." },
	{ q: "هل أستطيع تصميم رمز الإستجابة السريع الخاص بي ؟", a: "نعم. نوفر QR code مخصص بألوان وشعار مطعمك." },
	{ q: "هل هناك إمكانية للوصول إلى المنيو عبر جوجل ؟", a: "نعم. يمكن إضافة المنيو إلى صفحة جوجل للوصول السريع." },
	{ q: "هل أستطيع الحصول على باقة مخصصة ؟", a: "نعم. نوفر باقات مخصصة حسب احتياجاتك. تواصل معنا." },
];

export function FAQSection() {
	return (
		<section className="relative py-20 bg-white" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="max-w-3xl mx-auto">
					<div className="text-center mb-12">
						<span className="inline-flex text-xs font-medium text-orange bg-orange/10 rounded-sm px-2 py-0.5 mb-4">
							أسئلة واجوبة
						</span>
						<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl font-medium leading-[1.2] text-[#1f2124]">
							الأسئلة المتكررة
						</motion.h2>
					</div>
					<div className="space-y-3">
						{FAQ_ITEMS.map((faq, i) => (
							<motion.details key={i} {...fadeUp(i * 0.5)} className="group rounded-md border border-gray-200 bg-white open:border-orange/30 open:shadow-sm transition-all duration-300 overflow-hidden">
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
					<motion.div {...fadeUp(9)} className="text-center mt-8">
						<Link href="/contact">
							<Button variant="orange" size="lg" className="px-10 h-12">
								اطلب الخدمة
							</Button>
						</Link>
					</motion.div>
				</div>
			</div>
		</section>
	);
}

/* ── Clients Logos ── */
const CLIENTS = [
	"SOHO", "Telepizza", "The Cheese", "Empire", "Roomeroon",
	"Kubaba", "Radio City", "Terrace", "Coffee Central", "Dallaterra",
	"Tisa", "Parsian", "Khanum Tala", "Gardenia", "Mega Wix",
	"UnPan", "Ocean Blue", "Pizza Roma", "Al Waha", "Golden Fork",
];

export function ClientsSection() {
	return (
		<section className="relative py-16 bg-white overflow-hidden" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-10">
					<span className="inline-flex text-xs font-medium text-orange bg-orange/10 rounded-sm px-2 py-0.5 mb-4">
						بعض العملاء و المشاريع القائمة
					</span>
					<motion.h2 {...fadeUp(1)} className="text-2xl md:text-3xl font-medium text-[#1f2124]">
						عملاؤنا
					</motion.h2>
				</div>
				<motion.div {...fadeUp(2)} className="flex flex-wrap justify-center gap-4">
					{CLIENTS.map((name, i) => (
						<div key={i} className="px-5 py-3 rounded-md bg-gray-50 border border-gray-100 text-sm font-medium text-[#1f2124] hover:border-orange/30 transition-colors">
							{name}
						</div>
					))}
				</motion.div>
			</div>
		</section>
	);
}

/* ── Mid-page CTA Strip ── */
export function MidCTASection() {
	return (
		<section className="relative py-20 bg-[#111013]" dir="rtl">
			<div className="absolute inset-0 bg-gradient-to-b from-[#111013] via-orange/[0.02] to-[#111013]" />
			<div className="relative max-w-[1220px] mx-auto px-4 text-center">
				<motion.div {...fadeUp(0)}>
					<h2 className="text-3xl md:text-5xl font-medium leading-[1.15] text-white mb-4">
						اللي يواكب التطور
						<br />
						يسبق الجميع
					</h2>
					<p className="text-base text-[#c0c0c0] mb-8 max-w-xl mx-auto">
						اضغط على &apos;اشترِ الآن&apos; للبدء في رحلتك نحو التحول الرقمي.
					</p>
					<Link href="/subscribe">
						<Button variant="orange" size="lg" className="px-12 h-14 text-lg shadow-xl shadow-orange/20">
							إشترك الأان
						</Button>
					</Link>
				</motion.div>
			</div>
		</section>
	);
}

/* ── Contact Form ── */
export function ContactSection() {
	return (
		<section className="relative py-20 bg-white" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="max-w-xl mx-auto">
					<div className="text-center mb-10">
						<span className="inline-flex text-xs font-medium text-orange bg-orange/10 rounded-sm px-2 py-0.5 mb-4">
							نرحب بكم دائماً
						</span>
						<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl font-medium leading-[1.2] text-[#1f2124]">
							للأسئلة والإستفسارات
							<br />
							كن على تواصل
						</motion.h2>
					</div>
					<motion.form {...fadeUp(2)} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
						<input type="text" placeholder="الإسم بالكامل" className="w-full h-12 rounded-md border border-gray-200 bg-white px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all" />
						<input type="text" placeholder="إسم نشاطك" className="w-full h-12 rounded-md border border-gray-200 bg-white px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all" />
						<input type="email" placeholder="البريد الإلكترونى" className="w-full h-12 rounded-md border border-gray-200 bg-white px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all" />
						<input type="text" placeholder="الدولة" className="w-full h-12 rounded-md border border-gray-200 bg-white px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all" />
						<input type="tel" placeholder="رقم التواصل" className="w-full h-12 rounded-md border border-gray-200 bg-white px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all" />
						<textarea placeholder="رسالتك بالتفصيل" rows={5} className="w-full rounded-md border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 transition-all resize-none" />
						<Button type="submit" variant="orange" size="lg" className="w-full h-12 text-base">
							إرسال رسالتك
						</Button>
					</motion.form>
				</div>
			</div>
		</section>
	);
}

/* ── Final CTA ── */
export function CTASection() {
	return (
		<section className="relative overflow-hidden py-20 bg-background" dir="rtl">
			<div className="absolute top-0 start-0 size-96 -translate-x-1/4 -translate-y-1/4 rounded-full bg-orange/15 blur-[160px] pointer-events-none" />
			<div className="absolute bottom-0 end-0 size-96 translate-x-1/4 translate-y-1/4 rounded-full bg-orange/10 blur-[160px] pointer-events-none" />

			<div className="relative max-w-[1220px] mx-auto px-4 text-center">
				<motion.div {...fadeUp(0)}>
					<span className="inline-flex text-xs font-medium text-orange bg-orange/10 rounded-sm px-2 py-0.5 mb-6">
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
						. استقبل الطلبات عبر واتساب — وابدأ في دقائق.
					</p>
					<div className="flex gap-4 justify-center flex-wrap">
						<Link href="/subscribe">
							<motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
								<Button variant="orange" size="lg" className="px-10 h-14 text-base shadow-xl shadow-orange/20">
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
