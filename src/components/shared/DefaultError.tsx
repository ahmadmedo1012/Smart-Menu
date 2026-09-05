"use client";

import { useEffect } from "react";
import { error as logError } from "@/lib/logger";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * round85-C1: shared route-error boundary — previously 34 near-identical
 * error.tsx files (~1,340 LOC) re-implemented this exact UI while this
 * component sat unused. Route files now pass their specific copy/labels.
 */
export function DefaultError({
  error,
  reset,
  title = "حدث خطأ",
  description = "تعذر تحميل الصفحة. حاول مرة أخرى.",
  backHref = "/",
  backLabel = "العودة للرئيسية",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => { logError(error?.message || "Client error"); }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 animate-fade-in">
      <div className="relative mb-6">
        <div className="size-16 rounded-full glass flex items-center justify-center">
          <AlertTriangle className="size-8 text-destructive" />
        </div>
        <div className="absolute -inset-2 rounded-full bg-destructive/10 blur-xl -z-10" />
      </div>
      <h1 className="text-xl font-bold mb-2">{title}</h1>
      <p className="text-muted-foreground text-center max-w-md mb-6">{description}</p>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>إعادة المحاولة</Button>
        <Button variant="outline" onClick={() => {(window as Window).location.href = backHref}}>
          {backLabel}
        </Button>
      </div>
    </div>
  );
}
