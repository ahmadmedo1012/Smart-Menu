"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminTelegramError({
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
                        title="حدث خطأ في إعدادات تليجرام"
                        description="يرجى المحاولة مرة أخرى"
                        backHref="/"
                        backLabel="العودة للرئيسية"
                />
        )
}
