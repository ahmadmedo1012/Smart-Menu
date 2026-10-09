"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminSystemEventsError({
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
                        title="حدث خطأ في أحداث النظام"
                        description="تعذّر تحميل سجل الأحداث. حاول مرة أخرى."
                        backHref="/admin"
                        backLabel="العودة للوحة الإدارة"
                />
        )
}
