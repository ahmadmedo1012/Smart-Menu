"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminAuditLogsError({
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
                        title="حدث خطأ في سجل التدقيق"
                        description="تعذر تحميل سجل التدقيق. حاول مرة أخرى."
                        backHref="/admin"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
