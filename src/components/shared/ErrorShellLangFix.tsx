'use client';

import { useEffect } from 'react';

/**
 * r119-S5-P1-3: Next 16 (verified on 16.3.4) renders the global 404 inside a
 * hardcoded `<html id="__next_error__">` shell — the root layout's
 * lang="ar" dir="rtl" attributes and the boundary's own metadata title are
 * ignored on that path (the prerendered _not-found.html is correct, but the
 * served response always uses the bare shell). Inline scripts can't fix it
 * (the shell's body is empty until hydration, and hydrated scripts never
 * execute), so this client component restores the document-level contract
 * at hydration — the same tick the 404 content itself becomes visible.
 */
export function ErrorShellLangFix() {
        useEffect(() => {
                const html = document.documentElement;
                html.lang = 'ar';
                html.dir = 'rtl';
                // The error shell stamps the homepage title; restore the honest one
                // unless a more specific title was set elsewhere.
                if (document.title.includes('الربط الذكي | Smart Menu')) {
                        document.title = '404 - الصفحة غير موجودة';
                }
        }, []);
        return null;
}
