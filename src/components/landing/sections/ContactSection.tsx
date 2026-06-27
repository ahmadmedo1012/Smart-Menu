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

const fields = [
	{ id: "contact-name", label: "الإسم بالكامل", type: "text", placeholder: "مثال: أحمد علي" },
	{ id: "contact-business", label: "إسم نشاطك", type: "text", placeholder: "اسم المطعم أو المقهى" },
	{ id: "contact-email", label: "البريد الإلكترونى", type: "email", placeholder: "example@domain.com" },
	{ id: "contact-country", label: "الدولة", type: "text", placeholder: "ليبيا" },
	{ id: "contact-phone", label: "رقم التواصل", type: "tel", placeholder: "+218 91 000 0000" },
];

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
					<motion.form {...fadeUp(2)} className="space-y-5" onSubmit={handleSubmit}>
						{fields.map((f) => (
							<div key={f.id}>
								<label htmlFor={f.id} className="block text-sm font-medium mb-1.5">{f.label}</label>
								<input
									id={f.id}
									type={f.type}
									placeholder={f.placeholder}
									className="w-full h-12 rounded-sm bg-card border border-border/50 px-4 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/30 transition-all"
								/>
							</div>
						))}
						<div>
							<label htmlFor="contact-message" className="block text-sm font-medium mb-1.5">رسالتك بالتفصيل</label>
							<textarea
								id="contact-message"
								placeholder="اكتب رسالتك هنا..."
								rows={5}
								className="w-full rounded-sm bg-card border border-border/50 px-4 py-3 text-sm outline-none focus:border-orange focus:ring-2 focus:ring-orange/30 transition-all resize-none"
							/>
						</div>
						<Button type="submit" size="lg" className="w-full h-12 text-base">
							إرسال رسالتك
						</Button>
					</motion.form>
				</div>
			</div>
		</section>
	);
}
