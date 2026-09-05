"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function OwnerSettingsError({
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
                        title="حدث خطأ في الإعدادات"
                        description="تعذر تحميل الصفحة. قد يكون هناك خلل مؤقت."
                        backHref="/owner"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
