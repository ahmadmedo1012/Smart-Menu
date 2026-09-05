"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminOrderDetailError({
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
                        title="حدث خطأ في الطلب"
                        description="تعذر تحميل تفاصيل الطلب. حاول مرة أخرى."
                        backHref="/admin/orders"
                        backLabel="العودة للطلبات"
                />
        )
}
