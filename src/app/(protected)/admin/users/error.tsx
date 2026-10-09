"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminUsersError({
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
                        title="حدث خطأ في المستخدمين"
                        description="تعذّر تحميل قائمة المستخدمين. حاول مرة أخرى."
                        backHref="/admin"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
