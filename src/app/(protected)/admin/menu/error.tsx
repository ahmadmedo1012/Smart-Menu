"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminMenuError({
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
                        title="حدث خطأ في إدارة المنيو"
                        description="تعذّر تحميل الصفحة. حاول مرة أخرى."
                        backHref="/admin"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
