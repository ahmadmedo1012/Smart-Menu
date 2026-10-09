"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function AdminQrError({
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
                        title="حدث خطأ في رمز QR"
                        description="تعذّر تحميل الصفحة. حاول مرة أخرى."
                        backHref="/admin"
                        backLabel="العودة للوحة التحكم"
                />
        )
}
