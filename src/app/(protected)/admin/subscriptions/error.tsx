"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminSubscriptionsError({
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
                        title="حدث خطأ في الاشتراكات"
                        description="تعذّر تحميل الاشتراكات. حاول مرة أخرى."
                        backHref="/admin"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
