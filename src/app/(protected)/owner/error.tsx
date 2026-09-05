"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function OwnerError({
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
                        description="تعذر تحميل هذه الصفحة. يرجى المحاولة مرة أخرى."
                        backHref="/owner"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
