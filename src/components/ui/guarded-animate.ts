"use client";
/**
 * r135 (جذر انفجار q4 في CI): دالة animate من useAnimate في motion تحلّ
 * المحددات النصية ("‎.message-path"‎ ونحوها) عبر scope.current — فإذا أطلق
 * أثر متأخر (hover-end بعد فكّ التركيب، أو رسوم متبقية أثناء التحويل
 * التلقائي إلى ‎/cart‎) والمرجع صار null، انفجرت resolveElements داخل
 * الحزمة: `null.querySelectorAll(".message-path")`.
 *
 * البرهان: اختبار الضغط q4-add-cart-stress قبض pageerror بنفس الرسالة في
 * دورات 1-3 (حوار الصنف ← إضافة ← تحويل)، والـstack الملتقط (r135) يشير
 * إلى chunk الحركة عند resolveElements — وكل مواقع querySelectorAll في
 * كودنا محصّنة، والمكوّنات الوحيدة التي تمرّر محددًا نصيًا إلى animate هي
 * الأيقونات المتحركة (24 ملفًا).
 *
 * الحل: تمريرة تحرس وقت التشغيل فقط — استدعاء بمحدد نصي والنطاق مفكوك
 * يتحول إلى no-op ‏(Promise.resolve()) بدل الانفجار. الوسائط الأخرى
 * (عناصر، scope.current حتى لو null) آمنة أصلاً — animateElements في
 * motion يتقيدها بفحص null صريح.
 *
 * الأنواع: نعيد استخدام نوع animate الأصلي نفسه (as typeof animate) فلا
 * يتغير أي موقع استدعاء في الأيقونات — كل الـoverloads تبقى سليمة
 * زمنيًا، والحراسة وقت التشغيل وحدها.
 */

import { useCallback } from "react";
import { useAnimate } from "motion/react";

/* eslint-disable @typescript-eslint/no-explicit-any -- motion's animate يحمل
   overloads ثقيلة (عنصر/تسلسل) نمررها كما هي؛ الحراسة منطق وقت تشغيل
   فقط ولا ينبغي لها أن تشوّه التوقيع النوعي. */

export function useGuardedAnimate() {
        const [scope, animate] = useAnimate();
        const guarded = useCallback(
                (...args: any[]) => {
                        const target: unknown = args[0];
                        if (typeof target === "string" && !scope.current) {
                                return Promise.resolve();
                        }
                        return (animate as (...a: any[]) => any)(...args);
                },
                [animate, scope]
        ) as typeof animate;
        return [scope, guarded] as const;
}
