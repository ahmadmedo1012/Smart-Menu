"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 40 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-80px" },
	transition: { duration: 0.7, delay: delay * 0.1, ease: EASE },
});

export default function ContactSection() {
	const handleSubmit = (e: React.FormEvent) => e.preventDefault();

	return (
		<section className="relative py-20" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="max-w-xl mx-auto">
					<div className="text-center mb-10">
					<motion.h2 {...fadeUp(1)} className="text-3xl md:text-4xl font-medium leading-[1.2]">
							للأسئلة والإستفسارات
							<br />
							كن على تواصل
						</motion.h2>
					</div>
					<motion.form {...fadeUp(2)} className="space-y-4" onSubmit={handleSubmit}>
						<input
							type="text"
							placeholder="الإسم بالكامل"
							className="w-full h-12 rounded-sm bg-card border border-border px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/30 transition-all"
						/>
						<input
							type="text"
							placeholder="إسم نشاطك"
							className="w-full h-12 rounded-sm bg-card border border-border px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/30 transition-all"
						/>
						<input
							type="email"
							placeholder="البريد الإلكترونى"
							className="w-full h-12 rounded-sm bg-card border border-border px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/30 transition-all"
						/>
						<input
							type="text"
							placeholder="الدولة"
							className="w-full h-12 rounded-sm bg-card border border-border px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/30 transition-all"
						/>
						<input
							type="tel"
							placeholder="رقم التواصل"
							className="w-full h-12 rounded-sm bg-card border border-border px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/30 transition-all"
						/>
						<textarea
							placeholder="رسالتك بالتفصيل"
							rows={5}
							className="w-full rounded-sm bg-card border border-border px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/30 transition-all resize-none"
						/>
						<Button type="submit" size="lg" className="w-full h-12 text-base">
							إرسال رسالتك
						</Button>
					</motion.form>
				</div>
			</div>
		</section>
	);
}
