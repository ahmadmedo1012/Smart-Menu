'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useScroll, useTransform, useMotionValueEvent, motion, AnimatePresence } from 'motion/react';
import {} from 'lucide-react';
import { MotionMenu } from '@/components/ui/motion-icons';
import { cn } from '@/lib/utils';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

// Simple global nav so a visitor on any restaurant's menu can reach pricing/login
const menuGlobalLinks = [
  { href: '/pricing', label: 'الخطط والأسعار' },
  { href: '/login', label: 'تسجيل الدخول' },
];

export function StickyMenuHeader({ name, logo }: { name: string; logo?: string }) {
	/* ponytail: single scroll source — useScroll replaces native scroll listener */
	const { scrollYProgress } = useScroll();
	const [scrolled, setScrolled] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);

	useMotionValueEvent(scrollYProgress, 'change', (v) => {
		setScrolled(v > 0.02);
	});

	return (
		<>
			<div
				className={cn(
					'fixed inset-x-0 top-0 z-30 h-14 flex items-center px-4 gap-3 transition-all duration-300',
					scrolled ? 'glass-strong' : 'bg-transparent'
				)}
			>
				{/* logo — rounded-lg */}
				<div
					className={cn(
						'size-8 rounded-lg flex items-center justify-center shadow-sm shrink-0 overflow-hidden transition-all duration-300',
						scrolled
							? logo
								? 'ring-1 ring-border/30'
								: 'bg-gradient-to-br from-orange to-orange/80'
							: logo
								? 'ring-1 ring-white/20'
								: 'bg-gradient-to-br from-orange/80 to-orange/60'
					)}
				>
					{logo ? (
						<OptimizedImage src={logo} alt="" className="size-full" aspectRatio="square" skeleton={false} />
					) : (
						<svg
							className="size-4 text-white"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
							<polyline points="9 22 9 12 15 12 15 22" />
						</svg>
					)}
				</div>
				<div className="flex-1 min-w-0">
					<span
						className={cn(
							'font-bold text-sm truncate block transition-all duration-300',
							scrolled ? 'opacity-100' : 'opacity-0'
						)}
					>
						{name}
					</span>
				</div>
				<div className="flex items-center gap-2">
					{/* Desktop nav links */}
					<nav className="hidden md:flex items-center gap-1">
						{menuGlobalLinks.map((l) => (
							<Link
								key={l.href}
								href={l.href}
								className="px-3 py-2 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
							>
								{l.label}
							</Link>
						))}
					</nav>
					<ThemeToggle />
					{/* Mobile hamburger */}
					<button
						type="button"
						aria-label="القائمة"
						onClick={() => setMobileOpen((o) => !o)}
						className="md:hidden inline-flex items-center justify-center size-11 rounded-full bg-card border border-border hover:bg-accent/40 transition-colors"
					>
						<MotionMenu className="size-5" />
					</button>
				</div>
			</div>

			{/* Mobile drawer */}
			<AnimatePresence>
				{mobileOpen && (
					<motion.div
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						className="md:hidden fixed inset-x-3 top-16 z-40 rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-3 flex flex-col gap-1"
					>
						{menuGlobalLinks.map((l) => (
							<Link
								key={l.href}
								href={l.href}
								onClick={() => setMobileOpen(false)}
								className="px-4 py-3 rounded-xl text-sm font-medium hover:bg-accent/40 transition-colors"
							>
								{l.label}
							</Link>
						))}
					</motion.div>
				)}
			</AnimatePresence>

			{/* Scroll progress bar — RTL-aware origin-right */}
			<motion.div
				className="fixed inset-x-0 top-14 z-30 h-[2px] origin-right rtl:origin-left bg-gradient-to-r from-orange/60 to-orange"
				style={{ scaleX: progress }}
				aria-hidden
			/>
		</>
	);
}
