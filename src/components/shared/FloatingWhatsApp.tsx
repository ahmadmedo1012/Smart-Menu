"use client";

import { useEffect, useState } from 'react';
import AnimatedMessageCircle from '@/components/ui/message-circle-icon';
import { cn } from "@/lib/utils";
import { normalizeWaNumber } from "@/lib/whatsapp";

export function FloatingWhatsApp({ phone }: { phone?: string }) {
        /* r120 (U8-F-1): العنصر كان يُركَّب فورًا بشفافية 0 مع تأخير ظهور 3 ثوانٍ —
           قابلًا للتركيز طوالها (أول Tab يهبط على رابط غير مرئي). التركيب المؤجل
           بنفس التأخير يعطي نفس تجربة الظهور المتأخر مع خروجه من ترتيب التبويب
           والقارئات حتى يظهر فعلًا. */
        const [shown, setShown] = useState(false);
        useEffect(() => {
                const t = setTimeout(() => setShown(true), 3000);
                return () => clearTimeout(t);
        }, []);
        const adminPhone = normalizeWaNumber(phone || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "");
        if (!adminPhone || !shown) return null;
        return (
                <a
                        href={`https://wa.me/${adminPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                                /* r121 (J-1): كانت z-[60] فوق نطاق النوافذ المنبثقة (z-40/50)
                                   فتطفو فوق كل حوار مفتوح وتخطف نقرات أزرار الطلب.
                                   z-30 يبقيها فوق المحتوى العادي وتحت النوافذ. */
                                "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] end-4 sm:end-6 z-30",
                                "size-14 rounded-full bg-orange text-white",
                                "flex items-center justify-center",
                                "shadow-xl shadow-orange/30",
                                "hover:bg-orange/90 hover:scale-105 hover:shadow-2xl hover:shadow-orange/40",
                                "transition-[background-color,transform,translate,scale,rotate,box-shadow] duration-300",
                                "animate-fade-in"
                        )}
                        aria-label="تواصل عبر واتساب"
                >
                        <AnimatedMessageCircle className="size-7" />
                </a>
        );
}
