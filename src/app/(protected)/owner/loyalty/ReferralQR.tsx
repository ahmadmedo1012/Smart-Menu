'use client';

import { useEffect, useState } from 'react';
import type QRCodeLib from 'qrcode';

// round86-B8: the qrcode lib (~45KB gz) used to ship in this page's client
// bundle for a single static QR render — load it on mount instead
export function ReferralQR({ url }: { url: string }) {
	const [error, setError] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		import('qrcode')
			.then((mod: typeof QRCodeLib) => mod.toDataURL(url, { width: 180, margin: 2, color: { dark: '#000', light: '#fff' } }))
			.then((dataUrl) => { if (!cancelled) setQrDataUrl(dataUrl); })
			.catch(() => { if (!cancelled) setError(true); });
		return () => { cancelled = true; };
	}, [url]);

	if (error) return <p className="text-sm text-destructive">تعذر إنشاء الرمز — أعد المحاولة</p>;

	if (!qrDataUrl) return <div className="size-[180px] animate-pulse rounded-xl bg-muted" />;

	return (
		<div className="flex flex-col items-center gap-2">
			{/* ponytail: raw <img> — data: URL from qrcode.toDataURL(). next/image doesn't support data: URLs. */}
			<img
				src={qrDataUrl}
				alt="رمز QR للإحالة"
				className="rounded-xl border border-white/20"
				width={180}
				height={180}
			/>
			<p className="text-[10px] text-muted-foreground">امسح للمشاركة</p>
		</div>
	);
}
