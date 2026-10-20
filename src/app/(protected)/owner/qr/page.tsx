'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/shared/PageHeader';
import { premiumToast } from '@/lib/premium-toast';
import {Store, Smartphone, Printer, UtensilsCrossed} from 'lucide-react';
import AnimatedQrCode from '@/components/ui/qrcode-icon';
import { MotionArrowRight } from '@/components/ui/motion-icons';
import { MotionCheck } from '@/components/ui/motion-icons';
import AnimatedDownload from '@/components/ui/download-icon';
import AnimatedExternalLink from '@/components/ui/external-link-icon';
import AnimatedCopy from '@/components/ui/copy-icon';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useActiveRestaurant } from '@/components/owner/useActiveRestaurant';
// r106-N2: self-hosted QR (retire api.qrserver.com) — same brand colors.
import { SelfHostedQR, qrPngDataUrl } from '@/components/shared/SelfHostedQR';
// W6-B3 (G-1): per-table QR generation — pure range/URL logic lives in the lib
// (tested in isolation); each code encodes /menu/{slug}?table={N} which the
// customer side has captured since r135 (lib/table-session.ts).
import { parseTableRange, tableMenuUrl } from '@/lib/table-qr';
import { toArabicNumber } from '@/lib/format';
import { getArabicPlural } from '@/lib/arabic-plural';

const QR_SIZES = [
        { value: 200, label: 'صغير' },
        { value: 300, label: 'متوسط' },
        { value: 500, label: 'كبير' },
        { value: 1000, label: 'طباعة' },
];

/** صيغة الجمع الصحيحة لعدد الرموز في رسائل الحالة (r93-W2a). */
const qrCountLabel = (n: number) =>
        `${toArabicNumber(n)} ${getArabicPlural(n, 'رمز', { two: 'رمزان', few: 'رموز', many: 'رمزاً' })}`;

export default function OwnerQRPage() {
        const { activeId } = useActiveRestaurant();
        const router = useRouter();
        const [slug, setSlug] = useState('');
        const [name, setName] = useState('');
        const [url, setUrl] = useState('');
        // W6-B3: أصل الرابط مفصولاً عن رابط المنيو — رموز الطاولات تُبنى منه
        // مع ‎?table=N‎ (نفس الأصل الذي يرمّزه الرمز المفرد).
        const [origin, setOrigin] = useState('');
        const [loaded, setLoaded] = useState(false);
        const [copied, setCopied] = useState(false);
        const [qrSize, setQrSize] = useState(300);
        // W6-B3: الدفعة النشطة من رموز الطاولات (أرقام الطاولات). غير فارغة =
        // ورقة الطاولات هي ورقة الطباعة (الورقة المفردة تُفكَّق مؤقتاً —
        // انظر التعليق عند .print-qr-sheet أدناه).
        const [tableBatch, setTableBatch] = useState<number[]>([]);
        const qrRef = useRef<HTMLDivElement>(null);

        /* round88-E5: stamp a body class while this page is mounted — the
           @media-print rules in globals.css (body.qr-print-root) show ONLY the
           print sheet and hide the whole app chrome (sidebar/header/controls)
           for any printer. Removed on unmount so no other page is affected.
           W6-B3: the same root now governs TWO sheets — the single-QR sheet
           (.print-qr-sheet) and the per-table grid (.print-tables-sheet);
           only one of them is ever in the DOM at a time (see below). */
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
                                        setOrigin(window.location.origin);
                                }
                        })
                        .catch(() => premiumToast('error', 'تعذّر تحميل إعدادات المطعم'))
                        .finally(() => setLoaded(true));
                // W6-B3: switching the active restaurant must void any generated
                // table batch — its codes encode the PREVIOUS slug's menu URL and
                // would print as dead links for the new restaurant.
                setTableBatch([]);
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
                        // r106-N2: generated locally (data URL = same-origin) — no blob/fetch
                        // round-trip, no third-party call; `download` just works.
                        const dataUrl = await qrPngDataUrl(url, qrSize);
                        const link = document.createElement('a');
                        link.href = dataUrl;
                        link.download = `qr-${slug || 'menu'}-${qrSize}.png`;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        premiumToast('save', 'تم تحميل رمز QR');
                } catch {
                        premiumToast('error', 'تعذّر تحميل رمز QR');
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
                <div className="space-y-8 animate-fade-in max-w-xl mx-auto">
                        <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/owner')}
                                className="mb-2 text-muted-foreground"
                        >
                                <MotionArrowRight className="size-4 me-1" />
                                العودة
                        </Button>

                        <PageHeader
                                title="رمز QR"
                                subtitle="شارك المنيو الرقمي لمطعمك"
                        />

                        {/* Empty state — r131-F5 (A1 P0-3): joins the shared
                                primitive (was a hand-rolled icon + text). */}
                        {loaded && !url && (
                                <EmptyState
                                        icon={AnimatedQrCode}
                                        title="لا توجد بيانات للمطعم"
                                        description="أكمل إعداد بيانات مطعمك من الإعدادات ثم عد لإنشاء رمز QR."
                                        action={
                                                <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.push('/owner')}
                                                >
                                                        العودة للوحة التحكم
                                                </Button>
                                        }
                                />
                        )}

                        {/* QR Card */}
                        {url && (
                                <div className="rounded-lg bg-card/50 border border-border/30 overflow-hidden">
                                        {/* Restaurant info */}
                                        <div className="flex items-center gap-3 p-5 border-b border-border/20 bg-gradient-to-l from-orange-muted/30 to-transparent dark:from-orange-muted">
                                                <div className="size-10 rounded-full bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center">
                                                        <Store className="size-5 text-primary" />
                                                </div>
                                                <div>
                                                        <p className="font-bold">{name || 'المطعم'}</p>
                                                        <p className="text-xs text-muted-foreground">{url ? `/menu/${slug}` : '...'}</p>
                                                </div>
                                                {url && (
                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="ms-auto">
                                                                <Button variant="ghost" size="icon" aria-label="فتح الرابط">
                                                                        <AnimatedExternalLink className="size-4" />
                                                                </Button>
                                                        </a>
                                                )}
                                        </div>

                                        {/* QR Code */}
                                        <div ref={qrRef} className="flex justify-center py-8 bg-white/30 dark:bg-white/5">
                                                {url ? (
                                                        <div className="relative group">
                                                                {/* r106-N2: self-hosted render (data URL) — pixel-precise sizing kept,
                                                                    identical brand colors, zero third-party calls.
                                                                    W7-G (P0): aspect-ratio + height/auto — the old explicit
                                                                    height kept 500px on a clamped 390px width (non-uniform
                                                                    squash). Squareness is sacred for scannability. */}
                                                                <SelfHostedQR
                                                                        value={url}
                                                                        size={qrSize}
                                                                        alt={`QR Code - ${name}`}
                                                                        className="rounded-lg shadow-lg transition-[transform,translate,scale,rotate,box-shadow] duration-base group-hover:shadow-xl group-hover:scale-[1.02] motion-reduce:transition-none"
                                                                        style={{ width: qrSize, aspectRatio: '1 / 1', maxWidth: '100%', height: 'auto' }}
                                                                />
                                                                {/* Overlay with store icon */}
                                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                        <div className="size-12 md:size-16 rounded-md bg-card/90 dark:bg-night/90 shadow-lg flex items-center justify-center backdrop-blur-sm">
                                                                                <Store className="size-6 md:size-8 text-orange" />
                                                                        </div>
                                                                </div>
                                                        </div>
                                                ) : (
                                                        <>
                                                                {/* W7-G (A2 audit): الأشكال ترتجف بلمعة .skeleton القانونية — نبض الشفافية المتقاعد (animate-breath) كان لغة تحميل ثانية. */}
                                                                <div className="size-48 rounded-lg skeleton" />
                                                        </>
                                                )}
                                        </div>

                                        {/* Controls */}
                                        <div className="p-5 space-y-5">
                                                {/* Size selector — r131-F5 (A1 P0-4): canonical
                                                        control recipe (r-md + 600), was rounded-xl/500. */}
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
                                                                                        'flex-1 min-h-11 rounded-md text-sm font-semibold border transition-[color,background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97] active:duration-[var(--t-micro,80ms)]',
                                                                                        qrSize === s.value
                                                                                                ? 'bg-orange-muted border-orange/30 text-accent-foreground/80 dark:text-accent-foreground'
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
                                                                <Input id="qr-url-input" value={url} readOnly dir="ltr" className="text-sm" />
                                                                <Button
                                                                        variant="outline"
                                                                        size="icon"
                                                                        aria-label="نسخ الرابط"
                                                                        onClick={copy}
                                                                        className="size-11 shrink-0"
                                                                >
                                                                        {copied ? (
                                                                                <MotionCheck className="size-4 text-success-ink" />
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

                                                <div className="flex items-center gap-2 p-4 rounded-lg bg-gradient-to-r from-orange/5 to-orange/5 border border-orange/20">
                                                        <Printer className="size-4 text-primary shrink-0" />
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {tableBatch.length > 0 ? (
                                                                        <>
                                                                                ورقة الطاولات نشطة — هذا الزر معطّل حتى مسحها؛
                                                                                زر الطباعة في بطاقة «رمز لكل طاولة» يطبعها
                                                                        </>
                                                                ) : (
                                                                        <>
                                                                                اطبع رمز QR وضعه على الطاولات والفواتير والمواد الدعائية ليتمكن الزبائن من فتح
                                                                                المنيو مباشرة على هواتفهم
                                                                        </>
                                                                )}
                                                        </p>
                                                        {/* round88-E5: real print action — the print sheet renders the QR at
                                                            1000px (crisp at 65mm/300dpi) regardless of the on-screen size.
                                                            W6-B3: disabled while a table batch is active because the single-QR
                                                            print sheet is unmounted then (one sheet in the DOM at a time). */}
                                                        <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={printQR}
                                                                disabled={tableBatch.length > 0}
                                                                aria-label="طباعة رمز QR"
                                                                title={tableBatch.length > 0 ? 'امسح ورقة الطاولات أولاً' : undefined}
                                                                className="ms-auto shrink-0"
                                                        >
                                                                <Printer className="size-3.5" aria-hidden="true" />
                                                                طباعة
                                                        </Button>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {/* W6-B3 — per-table QR card: the r135 customer-side capture
                           (‎?table=N‎ → «طاولة: N» on the order) finally has an owner-side
                           producer. One card below the single-QR card; the generated grid
                           doubles as the print sheet (.print-tables-sheet). */}
                        {url && (
                                <TableQrsSection
                                        origin={origin}
                                        slug={slug}
                                        name={name}
                                        tableBatch={tableBatch}
                                        onBatch={setTableBatch}
                                />
                        )}

                        {/* round88-E5 — print sheet: invisible on screen (display:none), the ONLY
                                visible block on paper (globals.css body.qr-print-root rules). Placed
                                AFTER the live card; e2e now targets [data-testid="qr-code"] (r106-N2
                                retired the qrserver <img> the old selectors matched).
                                W6-B3: rendered ONLY while no table batch is active — .print-qr-sheet
                                and .print-tables-sheet share the body.qr-print-root print rules, so
                                exactly one of them may exist in the DOM when window.print() fires;
                                generating a table batch unmounts this sheet, clearing it remounts. */}
                        {url && tableBatch.length === 0 && (
                                <div className="print-qr-sheet" aria-hidden="true">
                                        <div className="hidden print:flex flex-col items-center gap-4">
                                                <p className="text-2xl font-bold text-black">{name || 'المطعم'}</p>
                                                {/* r132 (A3 must#2 closed): the print sheet renders
                                                    the QR at 65×65mm. The audit's "w-m] h-m] corrupted
                                                    classes" was an ANSI-stripping artifact of the report
                                                    pipeline — `[65m` is a valid SGR color code, so
                                                    `w-[65mm]` read back as `w-m]`; source + compiled CSS
                                                    were verified correct (`.w-\[65mm\]{width:65mm}`).
                                                    The inline style now pins the print geometry explicitly
                                                    too (belt-and-braces: sizing no longer depends on
                                                    Tailwind class generation, and the raw <img> gets
                                                    explicit dimensions at this call site). */}
                                                {/* W7-G (P0): نفس وصفة المربع المقدّس — عرض 65mm +
                                                    aspect-ratio بدل height صريحة؛ الطباعة تبقى 65×65mm
                                                    تماماً والانبعاج يستحيل حتى لو انضغط العرض. */}
                                                <SelfHostedQR
                                                        value={url}
                                                        size={1000}
                                                        alt=""
                                                        className="w-[65mm] h-[65mm]"
                                                        style={{ width: '65mm', aspectRatio: '1 / 1', maxWidth: '100%', height: 'auto' }}
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

/* ──────────────────────────────────────────────────────────────────────────
   W6-B3 (G-1) — «رمز لكل طاولة» card.
   Range input («من الطاولة … إلى …») → parseTableRange (lib/table-qr.ts) →
   a preview grid whose cells are ALSO the print sheet: on screen each QR is
   a small responsive square; on paper globals.css (body.qr-print-root) lifts
   .print-tables-sheet out of the card, lays it 2×65mm-per-row and paginates
   (absolute + break-inside:avoid — the recipe proven by /menu/[slug]/print).
   One QR per table, each encoding the r135 contract /menu/{slug}?table={N}.
   ────────────────────────────────────────────────────────────────────────── */
function TableQrsSection({
        origin,
        slug,
        name,
        tableBatch,
        onBatch,
}: {
        origin: string;
        slug: string;
        name: string;
        tableBatch: number[];
        onBatch: (tables: number[]) => void;
}) {
        const [from, setFrom] = useState('1');
        const [to, setTo] = useState('');
        const [error, setError] = useState<string | null>(null);
        const [downloading, setDownloading] = useState(false);

        const generate = () => {
                // Arabic-Indic digits fold to Western inside the parser (r138 family).
                const result = parseTableRange(from, to);
                if (!result.ok) {
                        setError(result.error);
                        premiumToast('error', result.error);
                        return;
                }
                setError(null);
                onBatch(result.tables);
                premiumToast('success', `تم توليد ${qrCountLabel(result.tables.length)} للطاولات`);
        };

        const clear = () => {
                onBatch([]);
                setError(null);
        };

        const printTables = () => window.print();

        const downloadAll = async () => {
                if (downloading || tableBatch.length === 0) return;
                setDownloading(true);
                try {
                        for (const n of tableBatch) {
                                // r106-N2: same local data-URL generation as the single QR
                                // download — 1000px so each PNG is crisp at 65mm/300dpi.
                                const dataUrl = await qrPngDataUrl(tableMenuUrl(origin, slug, n), 1000);
                                const link = document.createElement('a');
                                link.href = dataUrl;
                                link.download = `qr-${slug || 'menu'}-table-${n}.png`;
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                        }
                        premiumToast('save', `تم تحميل ${qrCountLabel(tableBatch.length)} — ملف لكل طاولة`);
                } catch {
                        premiumToast('error', 'تعذّر تحميل رموز الطاولات');
                } finally {
                        setDownloading(false);
                }
        };

        const first = tableBatch[0];
        const last = tableBatch[tableBatch.length - 1];

        return (
                <div className="rounded-lg bg-card/50 border border-border/30 overflow-hidden">
                        {/* Restaurant info */}
                        <div className="flex items-center gap-3 p-5 border-b border-border/20 bg-gradient-to-l from-orange-muted/30 to-transparent dark:from-orange-muted">
                                <div className="size-10 rounded-full bg-gradient-to-br from-orange/20 to-orange/10 flex items-center justify-center">
                                        <UtensilsCrossed className="size-5 text-primary" />
                                </div>
                                <div>
                                        <p className="font-bold">رمز لكل طاولة</p>
                                        <p className="text-xs text-muted-foreground">
                                                كل رمز يحمل رقم طاولته — الطلب يصل موقّعاً بها
                                        </p>
                                </div>
                        </div>

                        <div className="p-5 space-y-5">
                                {/* Range inputs — 44px inputs (h-11, r131-F4), dir=auto from the
                                        Input primitive, inputMode numeric for the Arabic-Indic keyboard. */}
                                <div role="group" aria-label="نطاق أرقام الطاولات">
                                        <Label className="text-xs text-muted-foreground">أرقام الطاولات</Label>
                                        <div className="grid grid-cols-2 gap-3 mt-1.5">
                                                <div>
                                                        <Label htmlFor="table-from" className="text-xs text-muted-foreground mb-1 block">
                                                                من الطاولة
                                                        </Label>
                                                        <Input
                                                                id="table-from"
                                                                inputMode="numeric"
                                                                autoComplete="off"
                                                                value={from}
                                                                onChange={(e) => setFrom(e.target.value)}
                                                                placeholder="1"
                                                                state={error ? 'error' : 'default'}
                                                                aria-invalid={error ? true : undefined}
                                                                aria-describedby={error ? 'table-range-error' : undefined}
                                                        />
                                                </div>
                                                <div>
                                                        <Label htmlFor="table-to" className="text-xs text-muted-foreground mb-1 block">
                                                                إلى الطاولة
                                                        </Label>
                                                        <Input
                                                                id="table-to"
                                                                inputMode="numeric"
                                                                autoComplete="off"
                                                                value={to}
                                                                onChange={(e) => setTo(e.target.value)}
                                                                placeholder="15"
                                                                state={error ? 'error' : 'default'}
                                                                aria-invalid={error ? true : undefined}
                                                                aria-describedby={error ? 'table-range-error' : undefined}
                                                        />
                                                </div>
                                        </div>
                                        {error && (
                                                <p id="table-range-error" role="alert" className="text-xs text-destructive mt-2">
                                                        {error}
                                                </p>
                                        )}
                                </div>

                                <div className="flex gap-3">
                                        <Button onClick={generate} className="flex-1 gap-2">
                                                {tableBatch.length > 0 ? 'إعادة التوليد' : 'توليد رموز الطاولات'}
                                        </Button>
                                        {tableBatch.length > 0 && (
                                                <Button variant="outline" onClick={clear} className="gap-2">
                                                        مسح الورقة
                                                </Button>
                                        )}
                                </div>

                                {tableBatch.length === 0 && (
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                مثال: من الطاولة 1 إلى الطاولة 15 — يبني النظام ورقة طباعة؛
                                                اطبعها وقصّها والصق رمزاً على كل طاولة، فيفتح الزبون المنيو ويصل
                                                الطلب مكتوباً عليه رقم طاولته. (تُقبل الأرقام الشرقية كما الغربية.)
                                        </p>
                                )}

                                {/* Generated batch — preview grid doubles as the print sheet */}
                                {tableBatch.length > 0 && (
                                        <div className="space-y-4">
                                                <p className="text-sm text-muted-foreground">
                                                        {qrCountLabel(tableBatch.length)} — من طاولة {toArabicNumber(first)} إلى طاولة {toArabicNumber(last)}
                                                </p>

                                                <div className="print-tables-sheet">
                                                        {/* Sheet header: print-only (the screen already shows the
                                                                card header; the paper cut needs the restaurant name). */}
                                                        <p className="hidden print:block text-2xl font-bold text-black text-center pb-4">
                                                                {name || 'المطعم'} — رموز الطاولات
                                                        </p>
                                                        <div
                                                                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 print-tables-grid"
                                                                role="list"
                                                                aria-label="رموز الطاولات"
                                                        >
                                                                {tableBatch.map((n) => (
                                                                        <div
                                                                                key={n}
                                                                                role="listitem"
                                                                                className="qr-table-cell flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/40 p-3 print:rounded-none print:border-black/40"
                                                                        >
                                                                                <SelfHostedQR
                                                                                        value={tableMenuUrl(origin, slug, n)}
                                                                                        size={1000}
                                                                                        alt={`رمز QR للطاولة ${n}`}
                                                                                        className="qr-table-cell-qr"
                                                                                        style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1' }}
                                                                                />
                                                                                <p className="text-sm font-semibold text-foreground print:text-black">
                                                                                        طاولة {toArabicNumber(n)}
                                                                                </p>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                        <Button variant="orange" onClick={printTables} className="gap-2">
                                                                <Printer className="size-4" aria-hidden="true" />
                                                                طباعة ورقة الطاولات
                                                        </Button>
                                                        <Button
                                                                variant="outline"
                                                                onClick={downloadAll}
                                                                loading={downloading}
                                                                aria-label="تحميل كل رموز الطاولات"
                                                                className="gap-2"
                                                        >
                                                                <AnimatedDownload className="size-4" />
                                                                تحميل الكل
                                                        </Button>
                                                </div>

                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                        كل رمز يفتح المنيو مع رقم طاولته في الرابط، فيصل الطلب إلى
                                                        واتساب المطعم وسطر «طاولة: N» في الملاحظات.
                                                </p>
                                        </div>
                                )}
                        </div>
                </div>
        );
}
