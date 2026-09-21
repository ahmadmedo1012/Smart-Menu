"use client"

import { DefaultError } from "@/components/shared/DefaultError"
import { ErrorShellLangFix } from "@/components/shared/ErrorShellLangFix"

export default function Error({
        error,
        reset,
}: {
        error: Error & { digest?: string }
        reset: () => void
}) {
        return (
                <>
                        {/* r119-S5-P1-3: root errors render in the same hardcoded
                                __next_error__ shell as 404s — restore lang/dir there too. */}
                        <ErrorShellLangFix />
                        <DefaultError
                                error={error}
                                reset={reset}
                                title="حدث خطأ غير متوقع"
                                description="يرجى المحاولة مرة أخرى"
                                backHref="/"
                                backLabel="العودة للرئيسية"
                        />
                </>
        )
}
