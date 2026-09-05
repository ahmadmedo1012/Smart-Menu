"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function ReviewsErrorPage({
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
                        title="حدث خطأ"
                        description="حدث خطأ في عرض التقييمات"
                        backHref="/"
                        backLabel="العودة للرئيسية"
                />
        )
}
