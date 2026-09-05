"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function OwnerRestaurantsError({
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
                        title="حدث خطأ في إدارة المطاعم"
                        description="تعذر تحميل صفحة المطاعم. حاول مرة أخرى."
                        backHref="/owner"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
