"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function OwnerOrdersError({
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
                        title="حدث خطأ في الطلبات"
                        description="تعذّر تحميل الطلبات. حاول مرة أخرى."
                        backHref="/owner"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
