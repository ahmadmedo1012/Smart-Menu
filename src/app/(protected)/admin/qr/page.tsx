'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { premiumToast } from '@/lib/premium-toast'
import { PageHeader } from '@/components/shared/PageHeader';
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
        // r118-A5-F4: distinguish loading / fetch-failure / genuinely-empty —
        // all three used to render «لا توجد مطاعم» (a flash on every visit and
        // a LIE on network failure).
        const [loadState, setLoadState] = useState<'loading' | 'error' | 'loaded'>('loading');
        const [selectedSlug, setSelectedSlug] = useState('');
        const [selectedName, setSelectedName] = useState('');
        const [copied, setCopied] = useState(false);
        const [qrSize, setQrSize] = useState(300);

        useEffect(() => {
                setLoadState('loading');
                fetch('/api/restaurants')
                        .then((r) => r.json())
                        .then((json) => {
                                const list = json.data?.restaurants ?? [];
                                setRestaurants(list);
                                if (list.length > 0) {
                                        setSelectedSlug(list[0].slug);
                                        setSelectedName(list[0].name);
                                }
                                setLoadState('loaded');
                        })
                        .catch(() => {
                                setLoadState('error');
                                premiumToast('error', 'تعذّر تحميل المطاعم');
                        });
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
                premiumToast('save', 'جارٍ تحميل رمز QR');
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
                        premiumToast('error', 'تعذّر تحميل رمز QR — حاول مجدداً');
                }
        };

                if (access === 'denied') return <AccessDenied />

        return (
                <div className="space-y-8 animate-fade-in max-w-xl mx-auto">
                        {/* r131-F5 (A1 P0-8): canonical page header (the 44px glow
                                tile head is gone). */}
                        <PageHeader
                                title="رمز QR"
                                subtitle="إنشاء رمز QR لكل مطعم"
                        />

                        {/* r118-A5-F4: three honest states instead of one conflated
                            «لا توجد مطاعم» for loading, failure AND empty. */}
                        {loadState === 'loading' && (
                                <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg bg-card/50 border border-border/30">
                                        <div className="size-16 rounded-full bg-orange/5 flex items-center justify-center mb-4 animate-pulse">
                                                <AnimatedQrCode className="size-7 text-orange/40" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">جارٍ تحميل المطاعم…</p>
                                </div>
                        )}

                        {loadState === 'error' && (
                                <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg bg-card/50 border border-border/30">
                                        <div className="size-16 rounded-full bg-orange/5 flex items-center justify-center mb-4">
                                                <AnimatedQrCode className="size-7 text-orange/40" />
                                        </div>
                                        <h2 className="font-heading text-lg font-semibold mb-1">تعذّر تحميل المطاعم</h2>
                                        <p className="text-sm text-muted-foreground max-w-xs mb-4">
                                                حدث خطأ في الاتصال. تحقق من الشبكة وحاول مجدداً.
                                        </p>
                                        <Button
                                                variant="outline"
                                                onClick={() => {
                                                        // re-run the effect by reloading restaurants inline
                                                        setLoadState('loading');
                                                        fetch('/api/restaurants')
                                                                .then((r) => r.json())
                                                                .then((json) => {
                                                                        const list = json.data?.restaurants ?? [];
                                                                        setRestaurants(list);
                                                                        if (list.length > 0) {
                                                                                setSelectedSlug(list[0].slug);
                                                                                setSelectedName(list[0].name);
                                                                        }
                                                                        setLoadState('loaded');
                                                                })
                                                                .catch(() => {
                                                                        setLoadState('error');
                                                                        premiumToast('error', 'تعذّر تحميل المطاعم');
                                                                });
                                                }}
                                        >
                                                إعادة المحاولة
                                        </Button>
                                </div>
                        )}

                        {loadState === 'loaded' && restaurants.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg bg-card/50 border border-border/30">
                                        <div className="size-16 rounded-full bg-orange/5 flex items-center justify-center mb-4">
                                                <AnimatedQrCode className="size-7 text-orange/40" />
                                        </div>
                                        <h2 className="font-heading text-lg font-semibold mb-1">لا توجد مطاعم</h2>
                                        <p className="text-sm text-muted-foreground max-w-xs">
                                                لم يتم العثور على مطاعم. قم بإضافة مطعم أولاً لإنشاء رمز QR.
                                        </p>
                                </div>
                        )}

                        {restaurants.length > 0 && (
                                <div className="rounded-lg bg-card/50 border border-border/30 overflow-hidden">
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
                                                                                        'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                                        selectedSlug === r.slug
                                                                                                ? 'bg-orange-muted border-orange/30 text-accent-foreground'
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
                                                        <div className="flex justify-center py-6 bg-white/30 dark:bg-white/5 rounded-lg">
                                                                <div className="relative group">
                                                                        {/* r106-N2: self-hosted render (data URL) — pixel-precise sizing kept,
                                                                            identical brand colors, zero third-party calls. */}
                                                                        <SelfHostedQR
                                                                                value={menuUrl}
                                                                                size={qrSize}
                                                                                alt={`QR - ${selectedName}`}
                                                                                className="rounded-lg shadow-lg transition-shadow group-hover:shadow-xl"
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
                                                                                        'flex-1 py-2.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                                                                                        qrSize === s.value
                                                                                                ? 'bg-orange-muted border-orange/30 text-accent-foreground'
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
                                                                <Input value={menuUrl} readOnly dir="ltr" className="text-sm" />
                                                                <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        aria-label="نسخ الرابط"
                                                                        onClick={copyLink}
                                                                        className="size-11 shrink-0"
                                                                >
                                                                        {copied ? (
                                                                                <MotionCheck className="size-4 text-success-ink" />
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
