'use client';

import { useState, useRef } from 'react';
import { usePollWhenVisible } from '@/hooks/usePollWhenVisible';
import {AlertTriangle, CheckCircle} from 'lucide-react';
import AnimatedX from '@/components/ui/x-icon';
import { cn } from '@/lib/utils';
import { m, AnimatePresence } from 'motion/react';

interface SubscriptionEvent {
        id: number;
        eventType: string;
        message: string;
        timestamp: string;
        createdAt: string;
}

/** Which approval outcome the banner is showing (r121-P-4 added `approved`). */
export type SubscriptionBannerKind = 'rejected' | 'approved';

// ponytail: client polling replaces SSE — Vercel kills server streams at 300s.
const POLL_MS = 15_000;

/**
 * r121-P-4 (IMPL-3): the approval half of the banner, extracted as a
 * presentational component so tests can pin both branches without driving the
 * 15s poll loop. Previously the notifier handled `subscription_rejected` ONLY —
 * the happiest moment of the funnel (payment approved) reached the owner solely
 * through the subscribe tab's own poll while that tab stayed open; the event
 * already flows through /api/user/events (server-filtered by metadata.userId),
 * so this branch needed ZERO API change.
 */
export function SubscriptionEventBanner({
        kind,
        message,
        onDismiss,
}: {
        kind: SubscriptionBannerKind;
        message: string;
        onDismiss: () => void;
}) {
        const approved = kind === 'approved';
        return (
                <m.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={cn(
                                'mx-4 mt-4 rounded-xl border-2 p-4 backdrop-blur-sm',
                                approved
                                        ? 'border-success/30 bg-gradient-to-r from-success/10 to-success/5 dark:from-success/20 dark:to-success/10'
                                        : 'border-destructive/30 bg-gradient-to-r from-destructive/10 to-destructive/5 dark:from-destructive/20 dark:to-destructive/10'
                        )}
                        role={approved ? 'status' : 'alert'}
                        aria-live={approved ? 'polite' : 'assertive'}
                >
                        <div className="flex items-start gap-3 rtl:flex-row-reverse">
                                <div
                                        className={cn(
                                                'size-10 rounded-full flex items-center justify-center shrink-0',
                                                approved ? 'bg-success/20' : 'bg-destructive/20'
                                        )}
                                >
                                        {approved ? (
                                                <CheckCircle className="size-5 text-success" aria-hidden="true" />
                                        ) : (
                                                <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
                                        )}
                                </div>
                                <div className="min-w-0 flex-1">
                                        <p className={cn('font-bold text-sm', approved ? 'text-success' : 'text-destructive')}>
                                                {approved ? 'تم تفعيل اشتراكك بنجاح!' : 'تم رفض طلب التفعيل'}
                                        </p>
                                        {message && (
                                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{message}</p>
                                        )}
                                        <p className="text-2xs text-muted-foreground/60 mt-2">
                                                {approved
                                                        ? 'حدّث الصفحة لتبدأ إدارة المنيو الخاص بك مباشرة.'
                                                        : 'يمكنك تعديل بيانات الدفع وإعادة المحاولة من صفحة الدفع'}
                                        </p>
                                        {approved && (
                                                <button
                                                        onClick={() => window.location.reload()}
                                                        className="mt-2 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/60"
                                                >
                                                        تحديث لوحة التحكم
                                                </button>
                                        )}
                                </div>
                                <button
                                        onClick={onDismiss}
                                        className="shrink-0 size-11 rounded-full flex items-center justify-center hover:bg-muted/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label="إغلاق"
                                >
                                        <AnimatedX className="size-3.5 text-muted-foreground" />
                                </button>
                        </div>
                </m.div>
        );
}

export function UserBannerNotifier() {
        const [banner, setBanner] = useState<{ kind: SubscriptionBannerKind; message: string } | null>(null);
        const lastIdRef = useRef(0);
        // round86-C3: shared visibility-aware poll loop (was a copy-pasted skeleton)
        usePollWhenVisible(async () => {
                try {
                        const res = await fetch(`/api/user/events?sinceId=${lastIdRef.current}`);
                        if (!res.ok) return;
                        const json = await res.json();
                        const events: SubscriptionEvent[] = json.data ?? [];
                        for (const ev of events) {
                                if (ev.id > lastIdRef.current) lastIdRef.current = ev.id;
                                // r121-P-4: الفرع الجديد — subscription_approved يصل عبر نفس
                                // التدفق (الفلاتر الخادمية بـ metadata.userId) بلا أي تغيير API.
                                if (ev.eventType === 'subscription_rejected') {
                                        setBanner({ kind: 'rejected', message: ev.message ?? '' });
                                } else if (ev.eventType === 'subscription_approved') {
                                        setBanner({ kind: 'approved', message: ev.message ?? '' });
                                }
                        }
                } catch {
                        /* transient — next tick retries */
                }
        }, POLL_MS);

        if (!banner) return null;

        return (
                <div className="w-full">
                        <AnimatePresence>
                                <SubscriptionEventBanner
                                        key={banner.kind}
                                        kind={banner.kind}
                                        message={banner.message}
                                        onDismiss={() => setBanner(null)}
                                />
                        </AnimatePresence>
                </div>
        );
}
