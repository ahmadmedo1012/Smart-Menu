"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 24 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-60px" },
	transition: { duration: 0.5, delay: delay * 0.1, ease: EASE },
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
		<section className="relative py-16 sm:py-20">
			<div className="max-w-[1220px] mx-auto px-4 sm:px-6">
				<div className="max-w-xl mx-auto">
					<div className="text-center mb-10 sm:mb-12">
						<motion.h2 {...fadeUp(1)} className="text-2xl sm:text-3xl md:text-4xl font-medium leading-[1.2]">
							للأسئلة والإستفسارات
							<br />
							كن على تواصل
						</motion.h2>
						<div className="mx-auto mt-4 w-16 h-0.5 rounded-full bg-orange/40" />
					</div>
					<motion.form {...fadeUp(2)} className="space-y-5" onSubmit={handleSubmit}>
						{fields.map((f) => (
							<div key={f.id}>
								<label htmlFor={f.id} className="block text-sm font-medium mb-1.5">{f.label}</label>
								<input
									id={f.id}
									type={f.type}
									placeholder={f.placeholder}
									className="w-full h-12 rounded-sm bg-card border border-border/50 px-4 text-sm outline-none focus-visible:border-orange focus-visible:ring-2 focus-visible:ring-orange/30 transition-all"
								/>
							</div>
						))}
						<div>
							<label htmlFor="contact-message" className="block text-sm font-medium mb-1.5">رسالتك بالتفصيل</label>
							<textarea
								id="contact-message"
								placeholder="اكتب رسالتك هنا..."
								rows={5}
								className="w-full rounded-sm bg-card border border-border/50 px-4 py-3 text-sm outline-none focus-visible:border-orange focus-visible:ring-2 focus-visible:ring-orange/30 transition-all resize-none"
							/>
						</div>
						<Button type="submit" size="lg" className="w-full">
							إرسال رسالتك
						</Button>
					</motion.form>
				</div>
			</div>
		</section>
	);
}
