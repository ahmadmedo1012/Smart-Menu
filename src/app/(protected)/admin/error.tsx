"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminError({
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
                        title="حدث خطأ في لوحة التحكم"
                        description="تعذر تحميل هذه الصفحة. قد يكون هناك خلل مؤقت في الاتصال."
                        backHref="/admin"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
