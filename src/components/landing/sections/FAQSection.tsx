"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 24 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-60px" },
	transition: { duration: 0.5, delay: delay * 0.1, ease: EASE },
});

const FAQ_ITEMS = [
	{ q: "ازاى اعمل منيو باركود ؟", a: "ببساطة - سجل مطعمك، أضف أصنافك، ثم شارك الرابط أو اطبع QR code. المنيو جاهز في دقائق." },
	{ q: "ما فائدة المنيو الإلكتروني ؟", a: "استغني عن طباعة المنيو. حدّث أسعارك فوراً. استقبل الطلبات عبر واتساب. حلِّل طلباتك. وفر وقتك وجهدك." },
	{ q: "هل يمكنني التعديل على المنيو دون التأثير على الباركود ؟", a: "نعم. أي تعديل يظهر فوراً. الباركود يبقى ثابت - يشير لأحدث نسخة." },
	{ q: "هل يمكن عمل منيو إلكتروني للأسر المنتجة ؟", a: "نعم. المنصة تدير الأسر المنتجة والمشاريع الصغيرة بكل سهولة." },
	{ q: "هل يدعم المنيو تحويل الطلب إلى الواتساب ؟", a: "نعم. أول منصة عربية تدعم إرسال الطلبات مباشرة إلى واتساب المطعم." },
	{ q: "هل المنيو الإلكتروني فقط للمطاعم ؟", a: "لا. يناسب المقاهي والمطاعم والفنادق والفود ترك ومراكز التجميل والمستشفيات والشركات." },
	{ q: "هل أستطيع تصميم رمز الإستجابة السريع الخاص بي ؟", a: "نعم. نوفر QR code مخصص بألوان وشعار مطعمك." },
	{ q: "هل هناك إمكانية للوصول إلى المنيو عبر جوجل ؟", a: "نعم. يمكن إضافة المنيو إلى صفحة جوجل للوصول السريع." },
	{ q: "هل أستطيع الحصول على باقة مخصصة ؟", a: "نعم. نوفر باقات مخصصة حسب احتياجاتك. تواصل معنا." },
];

export default function FAQSection() {
	return (
		<section className="relative py-16 sm:py-20">
			<div className="max-w-[1220px] mx-auto px-4 sm:px-6">
				<div className="max-w-3xl mx-auto">
					<div className="text-center mb-10 sm:mb-12">
						<motion.h2 {...fadeUp(1)} className="text-2xl sm:text-3xl md:text-4xl font-medium leading-[1.2]">
							الأسئلة المتكررة
						</motion.h2>
						<div className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-orange/40" />
					</div>
					<div className="space-y-2 sm:space-y-3">
						{FAQ_ITEMS.map((faq, i) => (
							<motion.details key={i} {...fadeUp(i * 0.4)} className="group rounded-sm bg-card border border-border open:border-orange/20 open:shadow-sm transition-all duration-300 overflow-hidden">
								<summary className="flex items-center justify-between cursor-pointer text-sm sm:text-base font-medium list-none px-4 sm:px-5 py-3 sm:py-4 hover:text-orange transition-colors [&::-webkit-details-marker]:hidden">
									{faq.q}
									<ChevronDown className="size-4 text-orange shrink-0 group-open:rotate-180 transition-transform duration-300" />
								</summary>
								<div className="px-4 sm:px-5 pb-3 sm:pb-4">
									<p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
								</div>
							</motion.details>
						))}
					</div>
					<motion.div {...fadeUp(9)} className="text-center mt-8">
						<Link href="/contact">
							<Button variant="outline" size="lg" className="px-10">
								اطلب الخدمة
							</Button>
						</Link>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
