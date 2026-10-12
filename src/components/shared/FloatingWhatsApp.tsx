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
                                   z-30 يبقيها فوق المحتوى العادي وتحت النوافذ.
                           r143: الدرجة نفسها صارت توكن سلّم Madarek (--z-float) —
                           القيمة 30 نفسها فصفر انحدار بصري. */
                                "fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] end-4 sm:end-6 z-(--z-float)",
                                /* r149 (SM4): كانت تبقى بأخضر واتساب الرسمي فتكسر لوحة
                                   المائدة النحاسية الكريمية (تدقيق r149). الفقاعة هنا
                                   ويدجت من الطرف الأول (هذا المكوّن نفسه، لا سكربت خارجي)
                                   فلوّنها نحاس الأسطول عبر توكن العلامة --orange؛ وعلى
                                   الهبوط تحديدًا يُثبّته landing.css على #B57438 في
                                   الثيمين معاً (html:has(.landing)) — أيقونة الحبر
                                   الداكن 4.95:1 على النحاس ✓. أزرار «اطلب عبر واتساب»
                                   داخل المنيو تبقى بأخضر واتساب — إشارتها وظيفية للعميل. */
                                "size-14 rounded-(--r-full) bg-orange text-orange-foreground",
                                "flex items-center justify-center",
                                "shadow-xl shadow-black/25",
                                "hover:brightness-95 hover:scale-105 hover:shadow-2xl hover:shadow-black/30",
                                "transition-[background-color,transform,translate,scale,rotate,box-shadow,filter] duration-base",
                                "animate-fade-in"
                        )}
                        aria-label="تواصل عبر واتساب"
                >
                        <AnimatedMessageCircle className="size-7" />
                </a>
        );
}
