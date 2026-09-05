"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function PricingError({
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
                        title="حدث خطأ في صفحة الأسعار"
                        description="يرجى المحاولة مرة أخرى"
                        backHref="/"
                        backLabel="العودة للرئيسية"
                />
        )
}
