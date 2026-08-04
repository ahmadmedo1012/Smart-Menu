'use client';

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { premiumToast } from '@/lib/premium-toast';
import {QrCode, Check, Store, ArrowRight, Smartphone, Printer} from 'lucide-react';
import AnimatedDownload from '@/components/ui/download-icon';;
import AnimatedExternalLink from '@/components/ui/external-link-icon';;
import AnimatedCopy from '@/components/ui/copy-icon';;
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
	}, []);

	const copy = () => {
		navigator.clipboard.writeText(url).then(() => {
			setCopied(true);
			premiumToast('copy', 'تم نسخ الرابط');
			setTimeout(() => setCopied(false), 2000);
		});
	};

	const downloadQR = () => {
		const link = document.createElement('a');
		const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}&format=png&bgcolor=ffffff&color=d97706`;
		link.href = qrUrl;
		link.download = `qr-${slug || 'menu'}-${qrSize}.png`;
		link.target = '_blank';
		link.click();
		premiumToast('save', 'جاري تحميل رمز QR');
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
				<ArrowRight className="size-4 me-1" />
				العودة
			</Button>

			<div className="flex items-center gap-3">
				<div className="size-11 rounded-md bg-gradient-to-br from-orange to-orange/80 flex items-center justify-center shadow-lg">
					<QrCode className="size-5 text-white" />
				</div>
				<div>
					<h2 className="text-2xl font-bold tracking-tight">رمز QR</h2>
					<p className="text-sm text-muted-foreground">شارك المنيو الرقمي لمطعمك</p>
				</div>
			</div>

			{/* Empty state */}
			{loaded && !url && (
				<div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
					<QrCode className="size-10 text-muted-foreground/50" />
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
									src={`https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(url)}&format=png&bgcolor=ffffff&color=d97706`}
									alt={`QR Code - ${name}`}
									className="rounded-xl shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-[1.02]"
									style={{ width: qrSize, height: qrSize, maxWidth: '100%' }}
								/>
								{/* Overlay with store icon */}
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
									<div className="size-12 md:size-16 rounded-md bg-white/90 dark:bg-gray-900/90 shadow-lg flex items-center justify-center backdrop-blur-sm">
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
						<div>
							<Label className="text-xs text-muted-foreground">حجم رمز QR</Label>
							<div className="flex gap-2 mt-1.5">
								{QR_SIZES.map((s) => (
									<button
										key={s.value}
										type="button"
										onClick={() => setQrSize(s.value)}
										className={cn(
											'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
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
							<Label className="text-xs text-muted-foreground">رابط المنيو</Label>
							<div className="flex gap-2 mt-1.5">
								<Input value={url} readOnly dir="ltr" className="text-sm h-11 rounded-xl" />
								<Button
									variant="outline"
									size="icon"
									aria-label="نسخ الرابط"
									onClick={copy}
									className="size-11 shrink-0"
								>
									{copied ? (
										<Check className="size-4 text-green-500" />
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
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
