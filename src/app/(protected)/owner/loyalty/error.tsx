"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function OwnerLoyaltyError({
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
                        title="حدث خطأ في الولاء"
                        description="تعذر تحميل صفحة الولاء. حاول مرة أخرى."
                        backHref="/owner"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
