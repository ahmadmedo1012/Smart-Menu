'use client';
/*
 * menu/use-menu-events.ts — P43 SM-2 (قياس التفاعل، الطرف الأول).
 *
 * قياس صادق خفيف من صفحة المنيو العامة — fire-and-forget عبر csrfFetch
 * بـ keepalive (الـEdge proxy يفرض Origin+double-submit على POST؛
 * sendBeacon وحده لا يستطيع حمل X-CSRF-Token). كل فشل صامت عمدًا:
 * التحليلات لا تعطّل تصفحًا أبدًا.
 *
 * الخصوصية: لا PII — نوع الحدث + اسم صنف/مصطلح بحث/رقم طاولة فقط.
 * خفض الضوضاء بحرّاس جلسة (sessionStorage): view مرة/جلسة لكل منيو،
 * item_open مرة/جلسة لكل صنف، qr_scan مرة/جلسة عند ?table=N.
 */

import { useCallback, useEffect, useRef } from 'react';
import { csrfFetch } from '@/lib/csrf-client';
import { normalizeArabic } from '@/lib/format';
import { MIN_SEARCH_TERM_LENGTH, MAX_SEARCH_TERM_LENGTH } from '@/lib/menu-events';

/** إرسال واحد — صامت تمامًا (‎.catch فارغة عمدًا). */
function sendEvent(payload: Record<string, unknown>): void {
        csrfFetch('/api/public/menu-events', {
                method: 'POST',
                keepalive: true,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
        }).catch(() => {
                /* تحليلات أفضل جهدًا — لا شيء يكسر التصفح */
        });
}

/** حرز جلسة (private-mode-safe): المفتاح موجود بالفعل → true (لا تُرسل ثانيًا). */
function sessionGuardHit(key: string): boolean {
        try {
                if (sessionStorage.getItem(key) !== null) return true;
                sessionStorage.setItem(key, '1');
                return false;
        } catch {
                return false; // وضع خاص/متعطل — نرسل (العدّ التقريبي أفضل من العدم)
        }
}

export function useMenuEvents({
        slug,
        tableNumber,
}: {
        slug: string | null;
        /** من captureTableFromUrl — قيمته عند التحميل فقط (r135-TABLE). */
        tableNumber: number | null;
}): {
        trackItemOpen: (itemKey: string) => void;
        trackSearch: (rawTerm: string) => void;
} {
        /* view — مرة واحدة لكل جلسة لكل منيو (تحديث الصفحة لا يضاعف العد). */
        useEffect(() => {
                if (!slug) return;
                if (sessionGuardHit(`sm-ev:view:${slug}`)) return;
                sendEvent({ slug, eventType: 'view' });
        }, [slug]);

        /* qr_scan — عند وجود ?table=N في التحميل (مسح QR للطاولة)، مرة/جلسة. */
        useEffect(() => {
                if (!slug || tableNumber == null) return;
                if (sessionGuardHit(`sm-ev:qr:${slug}`)) return;
                sendEvent({ slug, eventType: 'qr_scan', tableNumber });
        }, [slug, tableNumber]);

        /* item_open — فتح حوار الصنف؛ مرة/جلسة لكل صنف (المفتاح اسم العرض). */
        const trackItemOpen = useCallback(
                (itemKey: string) => {
                        if (!slug || !itemKey) return;
                        if (sessionGuardHit(`sm-ev:item:${slug}:${itemKey}`)) return;
                        sendEvent({ slug, eventType: 'item_open', itemKey: itemKey.slice(0, 120) });
                },
                [slug]
        );

        /* search — المصطلح المطبَّع (تجميع «قهوة/قهوه» معًا)، بلا تكرار لنفس
         * المصطلح المتتالي. الحد الأدنى بعد التطبيع (ضوضاء الحرف الواحد). */
        const lastSearchRef = useRef<string>('');
        const trackSearch = useCallback(
                (rawTerm: string) => {
                        if (!slug) return;
                        const term = normalizeArabic(rawTerm.trim()).slice(0, MAX_SEARCH_TERM_LENGTH);
                        if (term.length < MIN_SEARCH_TERM_LENGTH) return;
                        if (term === lastSearchRef.current) return;
                        lastSearchRef.current = term;
                        sendEvent({ slug, eventType: 'search', searchTerm: term });
                },
                [slug]
        );

        return { trackItemOpen, trackSearch };
}
