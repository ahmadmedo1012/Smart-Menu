'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import AnimatedUpload from '@/components/ui/upload-icon';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { csrfFetch } from '@/lib/csrf-client';
import { premiumToast } from '@/lib/premium-toast';
import { compressImage } from '@/lib/image-compress';

/**
 * round87-C7 — the optional bank-receipt upload block, extracted from
 * PaymentDialog. Self-contained uploading state; the dialog only owns the
 * resulting URL. Markup identical to the previous inline version.
 */
export function ReceiptUpload({
        receiptImageUrl,
        onReceiptChange,
}: {
        receiptImageUrl: string;
        onReceiptChange: (url: string) => void;
}) {
        const [uploading, setUploading] = useState(false);

        return (
                <div>
                        <span className="text-sm font-medium leading-none block">صورة التحويل (اختياري)</span>
                        <div className="flex items-center gap-2 mt-1.5">
                                <label
                                        className="h-11 px-4 rounded-xl border border-border/30 flex items-center justify-center gap-2 hover:bg-accent cursor-pointer text-sm text-muted-foreground"
                                        style={{
                                                opacity: uploading ? 0.5 : 1,
                                                pointerEvents: uploading ? 'none' : 'auto',
                                        }}
                                >
                                        <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={uploading}
                                                onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (!file) return;
                                                        setUploading(true);
                                                        premiumToast('info', 'جاري رفع الصورة...');
                                                        try {
                                                                const compressed = await compressImage(file);
                                                                const fd = new FormData();
                                                                fd.append('file', compressed, file.name.replace(/\.[^.]+$/, '.jpg'));
                                                                const r = await csrfFetch('/api/upload', {
                                                                        method: 'POST',
                                                                        body: fd,
                                                                });
                                                                const d = await r.json();
                                                                if (!r.ok) {
                                                                        premiumToast('error', d?.error || 'فشل رفع الصورة');
                                                                        return;
                                                                }
                                                                if (d.data?.url) onReceiptChange(d.data.url);
                                                                else premiumToast('error', 'فشل رفع الصورة');
                                                        } catch (err) {
                                                                premiumToast(
                                                                        'error',
                                                                        err instanceof Error ? err.message : 'فشل رفع الصورة'
                                                                );
                                                        } finally {
                                                                setUploading(false);
                                                        }
                                                }}
                                        />
                                        {uploading ? (
                                                <Loader2 className="size-4 text-muted-foreground animate-spin" />
                                        ) : (
                                                <AnimatedUpload className="size-4 text-muted-foreground" />
                                        )}
                                        {uploading ? 'جاري الرفع...' : 'اختر صورة'}
                                </label>
                                {receiptImageUrl && (
                                        <button
                                                type="button"
                                                onClick={() => onReceiptChange('')}
                                                className="text-xs text-destructive hover:underline shrink-0"
                                        >
                                                حذف الصورة
                                        </button>
                                )}
                        </div>
                        {receiptImageUrl && (
                                <div className="mt-2 rounded-md overflow-hidden size-20 border border-border/30">
                                        {/* round88-A2: box is size-20 (80px) */}
                                        <OptimizedImage
                                                src={receiptImageUrl}
                                                alt="صورة التحويل"
                                                className="size-full rounded-none"
                                                skeleton={false}
                                                sizes="80px"
                                        />
                                </div>
                        )}
                </div>
        );
}
