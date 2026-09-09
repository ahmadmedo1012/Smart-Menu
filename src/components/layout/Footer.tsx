"use client";
import Image from 'next/image';
import Link from 'next/link';
import { m, useReducedMotion } from 'motion/react';
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
        { href: '/menu/al-waha-cafe-demo', label: 'منيو تجريبي' },
        { href: '/login', label: 'تسجيل الدخول' },
        { href: '/subscribe', label: 'اشترك الآن' },
];

export function Footer({ className }: FooterProps) {
        const reduceMotion = useReducedMotion();
        return (
                <m.footer
                        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-40px" }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                className={cn('border-t border-border/40 bg-card/30 pt-12 sm:pt-16', className)}
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
                                                                className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-card transition-[color,background-color,border-color,box-shadow] duration-200 hover:border-accent-foreground/40 hover:bg-accent-foreground/10 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-accent-foreground/60"
                                                                aria-label="واتساب"
                                                        >
                                                                <AnimatedMessageCircle className="size-4" />
                                                        </a>
                                                </div>
                                        </div>

                                        <div>
                                                <h3 className="text-sm font-medium mb-3">روابط سريعة</h3>
                                                <div className="space-y-2.5 text-sm text-muted-foreground">
                                                        {/* r95: لهب — الرابط المهم يتحول للنصي الأسطع عند التحويم */}
                                                        {QUICK_LINKS.map((link) => (
                                                                <Link
                                                                        key={link.label}
                                                                        href={link.href}
                                                                        className="block w-fit hover:text-accent-foreground hover:underline underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:ring-accent-foreground/60 rounded-sm"
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
                                                        <Link href={waLink} className="block w-fit hover:text-accent-foreground hover:underline underline-offset-4 transition-colors">
                                                                واتساب
                                                        </Link>
                                                        <span className="block cursor-default hover:text-foreground transition-colors">
                                                                دعم فني عبر واتساب
                                                        </span>
                                                </div>
                                        </div>
                                </div>
                        </div>

                                {/* r95: تناغم SmartBot — شريط سفلي غارق bg-card/60 بعرض كامل
                                    (خارج حاوية 1220px ليأخذ عرض الصفحة) */}
                                <div className="border-t border-border/40 bg-card/60">
                                        <div className="max-w-[1220px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
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
                </m.footer>
        );
}
