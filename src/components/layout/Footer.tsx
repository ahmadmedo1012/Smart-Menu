"use client";
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';

// Single canonical support number — same env source as FloatingWhatsApp.
// Hardcoded per-number links drift (was 218911111111 placeholder vs 218910089975).
import { normalizeWaNumber } from "@/lib/whatsapp";
const waLink = `https://wa.me/${normalizeWaNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '218910089975')}`;

interface FooterProps {
	className?: string;
}

const QUICK_LINKS = [
	{ href: '/pricing', label: 'الخطط' },
	{ href: '/menu/al-waha-cafe', label: 'منيو تجريبي' },
	{ href: '/login', label: 'تسجيل الدخول' },
	{ href: '/subscribe', label: 'اشترك الآن' },
];

export function Footer({ className }: FooterProps) {
	const reduceMotion = useReducedMotion();
	return (
		<motion.footer
			initial={reduceMotion ? false : { opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-40px" }}
				transition={{ duration: 0.5, ease: 'easeOut' }}
				className={cn('border-t border-border/50 pt-12 sm:pt-16 pb-8 sm:pb-10', className)}
			>
				<div className="max-w-[1220px] mx-auto px-4 sm:px-6">
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-10 sm:mb-12">
					<div className="col-span-2 sm:col-span-1">
						<Image
							src="/brand-icon.png"
							alt="الربط الذكي"
							width={160}
							height={160}
							className="h-7 w-auto mb-4"
							loading="lazy"
						/>
						<p className="text-sm text-muted-foreground leading-relaxed mb-4">
							منصة رقمية لإدارة منيو المطاعم والمقاهي واستقبال الطلبات عبر واتساب
						</p>
						<div className="flex gap-2">
							<a
								href={waLink}
								className="size-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-orange/20 transition-colors"
								aria-label="واتساب"
							>
								<AnimatedMessageCircle className="size-4" />
							</a>
						</div>
					</div>

					<div>
						<h3 className="text-sm font-medium mb-3">روابط سريعة</h3>
						<div className="space-y-2.5 text-sm text-muted-foreground">
							{QUICK_LINKS.map((link) => (
								<Link
									key={link.label}
									href={link.href}
									className="block w-fit hover:text-foreground hover:underline underline-offset-4 transition-colors"
								>
									{link.label}
								</Link>
							))}
						</div>
					</div>

					<div>
						<h3 className="text-sm font-medium mb-3">الخدمات</h3>
						<div className="space-y-2.5 text-sm text-muted-foreground">
							{[
								'منيو إلكتروني',
								'طلب عبر واتساب',
								'برنامج ولاء',
								'إحصائيات وتحليلات',
								'QR كود مخصص',
							].map((label) => (
								<span
									key={label}
									className="block w-fit hover:text-foreground transition-colors cursor-default"
								>
									{label}
								</span>
							))}
						</div>
					</div>

					<div>
						<h3 className="text-sm font-medium mb-3">تواصل معنا</h3>
						<div className="space-y-2.5 text-sm text-muted-foreground">
							<Link href={waLink} className="block w-fit hover:text-foreground hover:underline underline-offset-4 transition-colors">
								واتساب
							</Link>
							<span className="block cursor-default hover:text-foreground transition-colors">
								دعم فني عبر واتساب
							</span>
						</div>
					</div>
				</div>

				<div className="border-t border-border/50 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
					<p className="text-xs text-muted-foreground">
						&copy; {new Date().getFullYear()} الربط الذكي | Smart Menu. جميع الحقوق محفوظة.
					</p>
					<div className="flex gap-4 text-xs text-muted-foreground">
						<Link href="/terms" className="hover:text-foreground transition-colors">
							شروط الاستخدام
						</Link>
						<Link href="/privacy" className="hover:text-foreground transition-colors">
							سياسة الخصوصية
						</Link>
					</div>
				</div>
			</div>
		</motion.footer>
	);
}
