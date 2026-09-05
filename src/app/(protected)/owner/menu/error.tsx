"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function OwnerMenuError({
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
                        description="تعذر تحميل صفحة إدارة المنيو. حاول مرة أخرى."
                        backHref="/owner"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
