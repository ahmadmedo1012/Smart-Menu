'use client';

import { useEffect, useState } from 'react';
// r121 (G-1): كان الاستيراد ثابتاً (import QRCode from 'qrcode') فيسحب سلسلة
// polyfills الخاصة بـ Node (crypto-browserify/bn.js/Buffer ≈ 127KB gz) إلى
// الحزمة المشتركة لـ 28 مساراً دون تنفيذها. الاستيراد الديناميكي عند التركيب
// (سابقة ReferralQR — round86-B8) يحمّل نسخة المتصفح النظيفة فقط.
import type QRCodeLib from 'qrcode';
import { cn } from '@/lib/utils';

interface SelfHostedQRProps {
        /** The URL (or text) to encode. Empty → skeleton placeholder. */
        value: string;
        /** Rendered/exported pixel size (square). */
        size: number;
        alt: string;
        className?: string;
        style?: React.CSSProperties;
}

/**
 * r106-N2 (ledger #7 / next-actions #7): retire api.qrserver.com — the QR
 * pages used to send every restaurant's menu URL to a third-party generator
 * (privacy leak + external dependency for a core feature + no offline/self-
 * hosted story). Renders via the already-installed `qrcode` npm package as a
 * PNG data URL: zero network calls, same brand colors as the old params
 * (bgcolor=ffffff / color=a86b1f), spec quiet-zone margin (4 modules).
 *
 * `data-testid="qr-code"` is the stable e2e hook (the old specs matched
 * img[src*="qrserver"], which no longer exists).
 */
export function SelfHostedQR({ value, size, alt, className, style }: SelfHostedQRProps) {
        const [src, setSrc] = useState('');

        useEffect(() => {
                let cancelled = false;
                if (!value) {
                        setSrc('');
                        return;
                }
                import('qrcode')
                        .then((mod: typeof QRCodeLib) =>
                                mod.toDataURL(value, {
                                        width: size,
                                        errorCorrectionLevel: 'M',
                                        color: { dark: '#a86b1f', light: '#ffffff' },
                                }),
                        )
                        .then((url) => {
                                if (!cancelled) setSrc(url);
                        })
                        .catch(() => {
                                if (!cancelled) setSrc('');
                        });
                return () => {
                        cancelled = true;
                };
        }, [value, size]);

        if (!src) {
                // Same breathing skeleton the pages already used for the loading state.
                return (
                        <div
                                className={cn('animate-breath rounded-xl bg-muted/50', className)}
                                style={{ width: size, height: size, maxWidth: '100%', ...style }}
                                aria-hidden="true"
                        />
                );
        }

        return (
                <img
                        src={src}
                        alt={alt}
                        data-testid="qr-code"
                        className={className}
                        style={style}
                />
        );
}

/**
 * r106-N2 companion: build a QR PNG data URL for the download buttons
 * (same options as <SelfHostedQR/>). A data URL is same-origin, so the
 * `download` attribute works directly — no blob/fetch round-trip needed
 * (the old code fetched the third-party PNG precisely because cross-origin
 * hrefs ignore `download`).
 */
export async function qrPngDataUrl(value: string, size: number): Promise<string> {
        // r121 (G-1): dynamic — نفس سبب التأجيل أعلاه؛ تُستدعى فقط من
        // معالجات زر التنزيل في صفحات qr المالك/الإدارة.
        const mod: typeof QRCodeLib = await import('qrcode');
        return mod.toDataURL(value, {
                width: size,
                errorCorrectionLevel: 'M',
                color: { dark: '#a86b1f', light: '#ffffff' },
        });
}
