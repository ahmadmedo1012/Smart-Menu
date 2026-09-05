"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function OwnerMenusError({
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
                        title="حدث خطأ في إدارة المنيوهات"
                        description="تعذر تحميل صفحة المنيوهات. حاول مرة أخرى."
                        backHref="/owner"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
