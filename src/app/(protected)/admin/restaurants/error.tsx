"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminRestaurantsError({
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
                        title="حدث خطأ في المطاعم"
                        description="تعذّر تحميل قائمة المطاعم. حاول مرة أخرى."
                        backHref="/admin"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
