"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 40 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-80px" },
	transition: { duration: 0.7, delay: delay * 0.1, ease: EASE },
});

const CLIENTS = [
	"SOHO", "Telepizza", "The Cheese", "Empire", "Roomeroon",
	"Kubaba", "Radio City", "Terrace", "Coffee Central", "Dallaterra",
	"Tisa", "Parsian", "Khanum Tala", "Gardenia", "Mega Wix",
	"UnPan", "Ocean Blue", "Pizza Roma", "Al Waha", "Golden Fork",
];

export default function ClientsSection() {
	return (
		<section className="relative py-20 border-t border-border/50 overflow-hidden" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-10">
					<motion.h2 {...fadeUp(1)} className="text-2xl md:text-3xl font-medium">
						عملاؤنا
					</motion.h2>
				</div>
				<motion.div {...fadeUp(2)} className="flex flex-wrap justify-center gap-3">
					{CLIENTS.map((name, i) => (
						<div key={i} className="px-4 py-2.5 rounded-md bg-card border border-border text-sm font-medium hover:border-orange/30 transition-colors">
							{name}
						</div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
