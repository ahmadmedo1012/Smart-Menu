"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.2, 1] as const;

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 40 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true, margin: "-80px" },
	transition: { duration: 0.7, delay: delay * 0.1, ease: EASE },
});

interface Client {
	name: string;
	slug: string;
}

const CLIENTS: Client[] = [
	{ name: "SOHO", slug: "soho" },
	{ name: "Telepizza", slug: "tp" },
	{ name: "The Cheese", slug: "tc" },
	{ name: "Empire", slug: "em" },
	{ name: "Roomeroon", slug: "rm" },
	{ name: "Kubaba", slug: "kb" },
	{ name: "Radio City", slug: "rc" },
	{ name: "Terrace", slug: "tr" },
	{ name: "Coffee Central", slug: "cc" },
	{ name: "Dallaterra", slug: "dt" },
	{ name: "Tisa", slug: "ts" },
	{ name: "Parsian", slug: "pr" },
	{ name: "Khanum Tala", slug: "kt" },
	{ name: "Gardenia", slug: "gd" },
	{ name: "Mega Wix", slug: "mw" },
	{ name: "UnPan", slug: "up" },
	{ name: "Ocean Blue", slug: "ob" },
	{ name: "Pizza Roma", slug: "pz" },
	{ name: "Al Waha", slug: "aw" },
	{ name: "Golden Fork", slug: "gf" },
];

// Generate SVG monogram initials
function Monogram({ name, slug }: { name: string; slug: string }) {
	const initial = slug.charAt(0).toUpperCase();
	const hue = (slug.charCodeAt(0) * 37 + slug.charCodeAt(slug.length - 1 || 0) * 13) % 360;
	return (
		<svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0" aria-label={name}>
			<rect width="48" height="48" rx="6" fill={`oklch(0.15 0.02 ${hue})`} />
			<text x="24" y="30" textAnchor="middle" fontFamily="AloaaxB,sans-serif" fontSize="20" fontWeight="700" fill="currentColor">{initial}</text>
		</svg>
	);
}

export default function ClientsSection() {
	return (
		<section className="relative py-20 overflow-hidden" dir="rtl">
			<div className="max-w-[1220px] mx-auto px-4">
				<div className="text-center mb-10">
					<motion.h2 {...fadeUp(1)} className="text-2xl md:text-3xl font-medium">
						عملاؤنا
					</motion.h2>
				</div>
				<motion.div {...fadeUp(2)} className="flex flex-wrap justify-center gap-3">
					{CLIENTS.map((client, i) => (
						<div
							key={i}
							className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border/50 shadow-sm hover:border-orange/30 hover:shadow-md hover:shadow-orange/5 transition-all duration-200 hover:scale-105"
						>
							<Monogram name={client.name} slug={client.slug} />
							<span className="text-sm font-medium">{client.name}</span>
						</div>
					))}
				</motion.div>
			</div>
		</section>
	);
}
