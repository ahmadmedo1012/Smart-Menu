"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function TermsError({
        error,
        reset,
}: {
        error: Error & { digest?: string }
        reset: () => void
}) {
        return (
                <DefaultError
                        error={error}
                        reset={reset}
                        title="حدث خطأ في تحميل الصفحة"
                        description="تعذر تحميل شروط الاستخدام. قد يكون هناك خلل مؤقت."
                        backHref="/"
                        backLabel="العودة للرئيسية"
                />
        )
}
