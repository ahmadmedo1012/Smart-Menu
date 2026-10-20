'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
        isInstallDismissed,
        dismissInstallPrompt,
        readInstallDismissal,
} from '@/lib/install-prompt';

interface BeforeInstallPromptEvent extends Event {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * r143 (Phase-4 W1, finding D7) — إعادة بناء حبة «تثبيت التطبيق»:
 *
 *  - زر إغلاق (×) يخفيها ويكتب النبذ في localStorage ~7 أيام (install-prompt.ts)؛
 *  - رفض نافذة المتصفح الأصلية (outcome === 'dismissed') يخفيها أيضًا — كانت
 *    الحبة تبقى معلقة على الشاشة بعد الرفض بلا أي مخرج (القبول وحده كان يمسحها)؛
 *  - z من سُلّم Madarek (‎--z-float = 30) بدل inline 9999 — قانون r126/r121:
 *    العناصر العائمة لا تغطي النوافذ أبدًا (درجتا --z-sheet/--z-toast فُوق
 *    النطاق الخام z-40/50 للحوارات الفعلية فكانتا تعيدان زحزحة tap-hijack
 *    J-1 ذاتها فوق أزرار المال — لذلك وُلدت درجة الطفو المخصصة)؛
 *  - أصناف نظام التصميم بدل inline styles (bg-popover/border/shadow/logical
 *    padding) وأهداف لمس ≥44px (زر الإغلاق 44px)؛
 *  - مركَّبة داخل <main> في التخطيطين (قاعدة round84: عناصر floating داخل
 *    landmark — كانت الوحيدة الباقية خارجه).
 */
export function InstallPrompt() {
        const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

        useEffect(() => {
                // مُنبَّهة لـ7 أيام؟ لا نستمع أصلًا — قبل الحدث نفسه (النبذ يحكم قبل الظهور)
                if (isInstallDismissed(readInstallDismissal())) return;
                const handler = (e: Event) => {
                        e.preventDefault();
                        setDeferredPrompt(e as BeforeInstallPromptEvent);
                };
                window.addEventListener('beforeinstallprompt', handler);
                return () => window.removeEventListener('beforeinstallprompt', handler);
        }, []);

        const handleInstall = async () => {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                // r143: أي حسم أصلي (قبول أو رفض) يُنهي الحبة — كان الرفض وحده
                // يتركها معلقة إلى الأبد بلا مخرج.
                setDeferredPrompt(null);
                await deferredPrompt.userChoice.catch(() => undefined);
        };

        if (!deferredPrompt) return null;

        return (
                <div
                        /* W7-G (VLM 13a, capture sm-pricing-1440): كانت الحبة تطفو في
                           منتصف الشاشة (‎left-1/2 -translate-x-1/2‎) فتغطي حافة بطاقة خطة
                           وزرّها في أسفل إطار العرض على /pricing — التقاط W7-G التقطها
                           فوق زر «اشترك الآن» (قرأت الـVLM نصها الصغير «تسديد الدفعات»
                           خطأً — هي «تثبيت التطبيق»). المراسي الآن على حافة الـFAB
                           نفسها (‎end-4/6‎) فوق حبة واتساب بفاصل عمودي واضح — مركز
                           الصفحة وأزرار المال تبقيان مكشوفين عند كل تمرير. */
                        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] end-4 sm:end-6 z-(--z-float) flex items-center gap-1 rounded-(--r-full) border border-border/50 bg-popover text-popover-foreground py-1 ps-2 pe-1 shadow-lg animate-fade-in"
                        role="group"
                        aria-label="تثبيت التطبيق"
                >
                        <button
                                type="button"
                                onClick={handleInstall}
                                className="min-h-11 rounded-(--r-full) px-3 text-base font-semibold"
                        >
                                تثبيت التطبيق
                        </button>
                        <button
                                type="button"
                                onClick={() => {
                                        dismissInstallPrompt();
                                        setDeferredPrompt(null);
                                }}
                                aria-label="إخفاء زر تثبيت التطبيق لأسبوع"
                                className="flex size-11 items-center justify-center rounded-(--r-full) text-muted-foreground transition-colors duration-fast hover:bg-accent hover:text-accent-foreground"
                        >
                                <X className="size-4" aria-hidden="true" />
                        </button>
                </div>
        );
}
