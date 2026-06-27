"use client";

import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.2, 1] as const;

const CLIENTS = [
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

function Monogram({ name, slug }: { name: string; slug: string }) {
	const initial = slug.charAt(0).toUpperCase();
	const hue = (slug.charCodeAt(0) * 37 + slug.charCodeAt(slug.length - 1 || 0) * 13) % 360;
	return (
		<svg width="36" height="36" viewBox="0 0 36 36" className="shrink-0" aria-label={name}>
			<rect width="36" height="36" rx="4" fill={`oklch(0.15 0.02 ${hue})`} />
			<text x="18" y="23" textAnchor="middle" fontFamily="AloaaxB,sans-serif" fontSize="14" fontWeight="700" fill="currentColor">{initial}</text>
		</svg>
	);
}

export default function ClientsSection() {
	return (
		<section style={{ willChange: "transform", backfaceVisibility: "hidden" }} className="relative py-16 sm:py-20 overflow-hidden">
			<div className="max-w-[1220px] mx-auto px-4 sm:px-6">
				<div className="text-center mb-10 sm:mb-12">
					<motion.h2
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6, ease: EASE }}
						className="text-xl sm:text-2xl md:text-3xl font-medium"
					>
						عملاؤنا
					</motion.h2>
					<div className="mx-auto mt-3 w-12 h-0.5 rounded-full bg-orange/40" />
					<p className="text-sm text-muted-foreground mt-4 max-w-xl mx-auto">
						آلاف المطاعم والمقاهي تثق في منصتنا الرقمية
					</p>
				</div>

				{/* Marquee row */}
				<div className="relative overflow-hidden">
					<div className="flex gap-3 animate-marquee">
						{[...CLIENTS, ...CLIENTS].map((client, i) => (
							<div key={i}
								className="flex items-center gap-2 px-3 py-2 rounded-sm bg-card border border-border/50 shadow-sm whitespace-nowrap shrink-0"
							>
								<Monogram name={client.name} slug={client.slug} />
								<span className="text-sm font-medium">{client.name}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
