'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { premiumToast } from '@/lib/premium-toast';
import {Store, Smartphone, Printer} from 'lucide-react';
import AnimatedQrCode from '@/components/ui/qrcode-icon';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import { MotionCheck } from '@/components/ui/motion-icons';
import AnimatedDownload from '@/components/ui/download-icon';
import AnimatedExternalLink from '@/components/ui/external-link-icon';
import AnimatedCopy from '@/components/ui/copy-icon';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';

const QR_SIZES = [
        { value: 200, label: 'صغير' },
        { value: 300, label: 'متوسط' },
        { value: 500, label: 'كبير' },
        { value: 1000, label: 'طباعة' },
];

export default function OwnerQRPage() {
        const { activeId } = useActiveRestaurant();
        const router = useRouter();
        const [slug, setSlug] = useState('');
        const [name, setName] = useState('');
        const [url, setUrl] = useState('');
        const [loaded, setLoaded] = useState(false);
        const [copied, setCopied] = useState(false);
        const [qrSize, setQrSize] = useState(300);
        const qrRef = useRef<HTMLDivElement>(null);

        /* round88-E5: stamp a body class while this page is mounted — the
           @media-print rules in globals.css (body.qr-print-root) show ONLY the
           print sheet and hide the whole app chrome (sidebar/header/controls)
           for any printer. Removed on unmount so no other page is affected. */
        useEffect(() => {
                document.body.classList.add('qr-print-root');
                return () => document.body.classList.remove('qr-print-root');
        }, []);

        const printQR = () => window.print();

        useEffect(() => {
                // Multi-menu: scope QR to the active restaurant
                const qs = activeId ? `?restaurantId=${activeId}` : '';
                fetch(`/api/settings${qs}`)
                        .then((r) => r.json())
                        .then((data) => {
                                const r = data.data?.restaurant ?? data.data;
                                if (r) {
                                        setSlug(r.slug);
                                        setName(r.name);
                                        setUrl(`${window.location.origin}/menu/${r.slug}`);
                                }
                        })
                        .catch(() => premiumToast('error', 'فشل تحميل إعدادات المطعم'))
                        .finally(() => setLoaded(true));
        }, [activeId]);

        const copy = () => {
                navigator.clipboard.writeText(url).then(() => {
                        setCopied(true);
                        premiumToast('copy', 'تم نسخ الرابط');
                        setTimeout(() => setCopied(false), 2000);
                });
        };

        const downloadQR = async () => {
                try {
                        // fetch the QR as a blob so the download attribute works
                        // (cross-origin hrefs ignore `download` in Chromium → opened a tab instead)
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}&format=png&bgcolor=ffffff&color=a86b1f`;
                        const res = await fetch(qrUrl);
                        if (!res.ok) throw new Error('فشل تحميل رمز QR');
                        const blob = await res.blob();
                        const objectUrl = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = objectUrl;
                        link.download = `qr-${slug || 'menu'}-${qrSize}.png`;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
                        premiumToast('save', 'تم تحميل رمز QR');
                } catch {
                        premiumToast('error', 'فشل تحميل رمز QR');
                }
        };

        const shareLink = () => {
                if (navigator.share) {
                        navigator.share({ title: `منيو ${name}`, url });
                } else {
                        copy();
                }
        };

        return (
                <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
                        <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/owner')}
                                className="mb-2 text-muted-foreground"
                        >
                                <MotionArrowRight className="size-4 me-1" />
                                العودة
                        </Button>

                        <div className="flex items-center gap-3">
                                <div className="size-11 rounded-md bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron))] flex items-center justify-center shadow-lg shadow-orange/25">
                                        <AnimatedQrCode className="size-5 text-espresso" />
                                </div>
                                <div>
                                        <h1 className="text-2xl font-bold tracking-normal">رمز QR</h1>
                                        <p className="text-sm text-muted-foreground">شارك المنيو الرقمي لمطعمك</p>
                                </div>
                        </div>

                        {/* Empty state */}
                        {loaded && !url && (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                                        <AnimatedQrCode className="size-10 text-muted-foreground/50" />
                                        <p className="text-sm">لا توجد بيانات للمطعم</p>
                                        <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push('/owner')}
                                                className="mt-2"
                                        >
                                                العودة للوحة التحكم
                                        </Button>
                                </div>
                        )}

                        {/* QR Card */}
                        {url && (
                                <div className="rounded-md bg-card/50 border border-border/30 overflow-hidden">
                                        {/* Restaurant info */}
                                        <div className="flex items-center gap-3 p-5 border-b border-border/20 bg-gradient-to-l from-orange-muted/30 to-transparent dark:from-orange-muted">
                                                <div className="size-10 rounded-xl bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center">
                                                        <Store className="size-5 text-primary" />
                                                </div>
                                                <div>
                                                        <p className="font-bold">{name || 'المطعم'}</p>
                                                        <p className="text-xs text-muted-foreground">{url ? `/menu/${slug}` : '...'}</p>
                                                </div>
                                                {url && (
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="ms-auto">
                                                                <Button variant="ghost" size="icon" aria-label="فتح الرابط" className="size-9">
                                                                        <AnimatedExternalLink className="size-4" />
                                                                </Button>
                                                        </a>
                                                )}
                                        </div>

                                        {/* QR Code */}
                                        <div ref={qrRef} className="flex justify-center py-8 bg-white/30 dark:bg-white/5">
                                                {url ? (
                                                        <div className="relative group">
                                                                {/* ponytail: raw <img> — external QR API URL. next/image remotePatterns doesn't support query-param-variant URLs (size changes per render). layout needs precise pixel dimensions (not fill+cover). */}
                                                                <img
                                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}&format=png&bgcolor=ffffff&color=a86b1f`}
                                                                        alt={`QR Code - ${name}`}
                                                                        className="rounded-xl shadow-lg transition-[transform,translate,scale,rotate,box-shadow] duration-300 group-hover:shadow-xl group-hover:scale-[1.02] motion-reduce:transition-none"
                                                                        style={{ width: qrSize, height: qrSize, maxWidth: '100%' }}
                                                                />
                                                                {/* Overlay with store icon */}
                                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                        <div className="size-12 md:size-16 rounded-md bg-card/90 dark:bg-night/90 shadow-lg flex items-center justify-center backdrop-blur-sm">
                                                                                <Store className="size-6 md:size-8 text-orange" />
                                                                        </div>
                                                                </div>
                                                        </div>
                                                ) : (
                                                        <div className="size-48 rounded-xl bg-muted/50 animate-breath" />
                                                )}
                                        </div>

                                        {/* Controls */}
                                        <div className="p-5 space-y-5">
                                                {/* Size selector */}
                                                <div role="group" aria-label="حجم رمز QR">
                                                        <Label className="text-xs text-muted-foreground">حجم رمز QR</Label>
                                                        <div className="flex gap-2 mt-1.5">
                                                                {QR_SIZES.map((s) => (
                                                                        <button
                                                                                key={s.value}
                                                                                type="button"
                                                                                onClick={() => setQrSize(s.value)}
                                                                                aria-pressed={qrSize === s.value}
                                                                                className={cn(
                                                                                        'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-[color,background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                        qrSize === s.value
                                                                                                ? 'bg-orange-muted border-orange/30 text-orange/80 dark:text-orange'
                                                                                                : 'border-border/30 hover:border-orange/20'
                                                                                )}
                                                                        >
                                                                                {s.label}
                                                                        </button>
                                                                ))}
                                                        </div>
                                                </div>

                                                {/* URL */}
                                                <div>
                                                        <Label htmlFor="qr-url-input" className="text-xs text-muted-foreground">رابط المنيو</Label>
                                                        <div className="flex gap-2 mt-1.5">
                                                                <Input id="qr-url-input" value={url} readOnly dir="ltr" className="text-sm h-11 rounded-xl" />
                                                                <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        aria-label="نسخ الرابط"
                                                                        onClick={copy}
                                                                        className="size-11 shrink-0"
                                                                >
                                                                        {copied ? (
                                                                                <MotionCheck className="size-4 text-success" />
                                                                        ) : (
                                                                                <AnimatedCopy className="size-4" />
                                                                        )}
                                                                </Button>
                                                        </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="grid grid-cols-2 gap-3">
                                                        <Button onClick={downloadQR} className="gap-2">
                                                                <AnimatedDownload className="size-4" />
                                                                تحميل QR
                                                        </Button>
                                                        <Button variant="outline" onClick={shareLink} className="gap-2">
                                                                <Smartphone className="size-4" />
                                                                مشاركة
                                                        </Button>
                                                </div>

                                                <div className="flex items-center gap-2 p-4 rounded-xl bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20">
                                                        <Printer className="size-4 text-primary shrink-0" />
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                                اطبع رمز QR وضعه على الطاولات والفواتير والمواد الدعائية ليتمكن الزبائن من فتح
                                                                المنيو مباشرة على هواتفهم
                                                        </p>
                                                        {/* round88-E5: real print action — the print sheet renders the QR at
                                                            1000px (crisp at 65mm/300dpi) regardless of the on-screen size. */}
                                                        <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={printQR}
                                                                aria-label="طباعة رمز QR"
                                                                className="ms-auto shrink-0"
                                                        >
                                                                <Printer className="size-3.5" aria-hidden="true" />
                                                                طباعة
                                                        </Button>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {/* round88-E5 — print sheet: invisible on screen (display:none), the ONLY
                                visible block on paper (globals.css body.qr-print-root rules). Placed
                                AFTER the live card so e2e `img[src*=qrserver].first()` keeps matching the
                                on-screen QR (round79 journey depends on it). */}
                        {url && (
                                <div className="print-qr-sheet" aria-hidden="true">
                                        <div className="hidden print:flex flex-col items-center gap-4">
                                                <p className="text-2xl font-bold text-black">{name || 'المطعم'}</p>
                                                <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(url)}&format=png&bgcolor=ffffff&color=a86b1f`}
                                                        alt=""
                                                        className="w-[65mm] h-[65mm]"
                                                />
                                                <p className="text-lg font-medium text-black">امسح الرمز لتصفح المنيو</p>
                                                <p dir="ltr" className="text-sm text-black">{url}</p>
                                                <p className="text-xs text-black/60">مدعوم من الربط الذكي — Smart Menu</p>
                                        </div>
                                </div>
                        )}
                </div>
        );
}
