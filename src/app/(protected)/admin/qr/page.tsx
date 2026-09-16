'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { premiumToast } from '@/lib/premium-toast';
import { Store } from 'lucide-react';
import AnimatedQrCode from '@/components/ui/qrcode-icon';
import { MotionCheck } from '@/components/ui/motion-icons';
import AnimatedDownload from '@/components/ui/download-icon';
import AnimatedExternalLink from '@/components/ui/external-link-icon';
import AnimatedCopy from '@/components/ui/copy-icon';
import { cn } from '@/lib/utils';
import { useAccessGate, allowRolesOrPermission } from '@/hooks/useAccessGate';
import { AccessDenied } from '@/components/shared/AccessDenied';
// round89-E5: shared row type (was a local id/name/slug-only copy)
import type { Restaurant } from '@/lib/restaurant-types';
// r106-N2: self-hosted QR (retire api.qrserver.com) — same brand colors.
import { SelfHostedQR, qrPngDataUrl } from '@/components/shared/SelfHostedQR';

const QR_SIZES = [
        { value: 200, label: 'صغير' },
        { value: 300, label: 'متوسط' },
        { value: 500, label: 'كبير' },
        { value: 1000, label: 'طباعة' },
];

export default function AdminQRPage() {
        const access = useAccessGate(allowRolesOrPermission(['super_admin', 'admin'], 'MANAGE_RESTAURANTS'));


        const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
        const [selectedSlug, setSelectedSlug] = useState('');
        const [selectedName, setSelectedName] = useState('');
        const [copied, setCopied] = useState(false);
        const [qrSize, setQrSize] = useState(300);

        useEffect(() => {
                fetch('/api/restaurants')
                        .then((r) => r.json())
                        .then((json) => {
                                const list = json.data?.restaurants ?? [];
                                setRestaurants(list);
                                if (list.length > 0) {
                                        setSelectedSlug(list[0].slug);
                                        setSelectedName(list[0].name);
                                }
                        })
                        .catch(() => premiumToast('error', 'فشل تحميل المطاعم'));
        }, []);

        const menuUrl = selectedSlug ? `${window.location.origin}/menu/${selectedSlug}` : '';

        const copyLink = () => {
                navigator.clipboard.writeText(menuUrl).then(() => {
                        setCopied(true);
                        premiumToast('copy', 'تم نسخ الرابط');
                        setTimeout(() => setCopied(false), 2000);
                });
        };

        const downloadQR = async () => {
                premiumToast('save', 'جاري تحميل رمز QR');
                try {
                        // r106-N2: generated locally (data URL = same-origin) — the old
                        // blob/fetch dance existed only because the third-party PNG was
                        // cross-origin; `download` just works now.
                        const dataUrl = await qrPngDataUrl(menuUrl, qrSize);
                        const link = document.createElement('a');
                        link.href = dataUrl;
                        link.download = `qr-${selectedSlug}-${qrSize}.png`;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                } catch {
                        premiumToast('error', 'تعذر تحميل رمز QR — حاول مجدداً');
                }
        };

                if (access === 'denied') return <AccessDenied />

        return (
                <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
                        <div className="flex items-center gap-3">
                                <div className="size-11 rounded-md bg-[linear-gradient(135deg,var(--c-ember),var(--c-saffron))] flex items-center justify-center shadow-lg shadow-orange/25">
                                        <AnimatedQrCode className="size-5 text-espresso" />
                                </div>
                                <div>
                                        <h1 className="text-2xl font-bold tracking-normal">رمز QR</h1>
                                        <p className="text-sm text-muted-foreground">إنشاء رمز QR لكل مطعم</p>
                                </div>
                        </div>

                        {restaurants.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-card/50 border border-border/30">
                                        <div className="size-16 rounded-full bg-orange/5 flex items-center justify-center mb-4">
                                                <AnimatedQrCode className="size-7 text-orange/40" />
                                        </div>
                                        <h2 className="text-lg font-semibold mb-1">لا توجد مطاعم</h2>
                                        <p className="text-sm text-muted-foreground max-w-xs">
                                                لم يتم العثور على مطاعم. قم بإضافة مطعم أولاً لإنشاء رمز QR.
                                        </p>
                                </div>
                        )}

                        {restaurants.length > 0 && (
                                <div className="rounded-xl bg-card/50 border border-border/30 overflow-hidden">
                                        {/* Restaurant selector */}
                                        <div className="p-5 space-y-4">
                                                <div>
                                                        <span id="qr-rest-label" className="text-sm font-medium leading-none block">اختر المطعم</span>
                                                        <div role="group" aria-labelledby="qr-rest-label" className="flex gap-2 mt-1.5">
                                                                {restaurants.map((r) => (
                                                                        <button
                                                                                key={r.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                        setSelectedSlug(r.slug);
                                                                                        setSelectedName(r.name);
                                                                                }}
                                                                                className={cn(
                                                                                        'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                        selectedSlug === r.slug
                                                                                                ? 'bg-orange-muted border-orange/30 text-orange'
                                                                                                : 'border-border/30 hover:border-orange/30'
                                                                                )}
                                                                        >
                                                                                <Store className="size-4" />
                                                                                {r.name}
                                                                        </button>
                                                                ))}
                                                        </div>
                                                </div>

                                                {/* QR Code display */}
                                                {menuUrl && (
                                                        <div className="flex justify-center py-6 bg-white/30 dark:bg-white/5 rounded-xl">
                                                                <div className="relative group">
                                                                        {/* r106-N2: self-hosted render (data URL) — pixel-precise sizing kept,
                                                                            identical brand colors, zero third-party calls. */}
                                                                        <SelfHostedQR
                                                                                value={menuUrl}
                                                                                size={qrSize}
                                                                                alt={`QR - ${selectedName}`}
                                                                                className="rounded-xl shadow-lg transition-shadow group-hover:shadow-xl"
                                                                                style={{ width: qrSize, height: qrSize, maxWidth: '100%' }}
                                                                        />
                                                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                                <div className="size-10 md:size-14 rounded-md bg-card/90 shadow flex items-center justify-center">
                                                                                        <Store className="size-5 md:size-7 text-orange" />
                                                                                </div>
                                                                        </div>
                                                                </div>
                                                        </div>
                                                )}

                                                {/* Size selector */}
                                                <div>
                                                        <Label className="text-xs text-muted-foreground">الحجم</Label>
                                                        <div className="flex gap-2 mt-1.5">
                                                                {QR_SIZES.map((s) => (
                                                                        <button
                                                                                key={s.value}
                                                                                type="button"
                                                                                onClick={() => setQrSize(s.value)}
                                                                                className={cn(
                                                                                        'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange/60',
                                                                                        qrSize === s.value
                                                                                                ? 'bg-orange-muted border-orange/30 text-orange'
                                                                                                : 'border-border/30 hover:border-orange/30'
                                                                                )}
                                                                        >
                                                                                {s.label}
                                                                        </button>
                                                                ))}
                                                        </div>
                                                </div>

                                                {/* URL + Actions */}
                                                <div>
                                                        <Label className="text-xs text-muted-foreground">الرابط</Label>
                                                        <div className="flex gap-2 mt-1.5">
                                                                <Input value={menuUrl} readOnly dir="ltr" className="text-sm h-11 rounded-xl" />
                                                                <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        aria-label="نسخ الرابط"
                                                                        onClick={copyLink}
                                                                        className="size-11 shrink-0"
                                                                >
                                                                        {copied ? (
                                                                                <MotionCheck className="size-4 text-success" />
                                                                        ) : (
                                                                                <AnimatedCopy className="size-4" />
                                                                        )}
                                                                </Button>
                                                                <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        aria-label="فتح الرابط"
                                                                        className="size-11 shrink-0"
                                                                        onClick={() => window.open(menuUrl, '_blank', 'noopener,noreferrer')}
                                                                >
                                                                        <AnimatedExternalLink className="size-4" />
                                                                </Button>
                                                        </div>
                                                </div>

                                                <Button onClick={downloadQR} className="w-full h-12 gap-2">
                                                        <AnimatedDownload className="size-4" />
                                                        تحميل رمز QR ({qrSize}x{qrSize})
                                                </Button>
                                        </div>
                                </div>
                        )}
                </div>
        );
}
