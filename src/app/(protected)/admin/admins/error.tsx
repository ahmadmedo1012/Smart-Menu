"use client"

import { DefaultError } from "@/components/shared/DefaultError"

export default function ErrorPage({
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
                        description="حدث خطأ"
                        backHref="/"
                        backLabel="العودة للرئيسية"
                />
        )
}
