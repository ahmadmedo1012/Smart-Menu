"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function PrivacyError({
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
                        description="تعذر تحميل سياسة الخصوصية. قد يكون هناك خلل مؤقت."
                        backHref="/"
                        backLabel="العودة للرئيسية"
                />
        )
}
