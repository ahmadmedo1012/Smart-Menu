import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { CheckCircle2, AlertCircle } from "lucide-react"

import { cn } from "@/lib/utils"

function Input({
	className,
	type,
	state = "default",
	...props
}: React.ComponentProps<"input"> & {
	state?: "default" | "error" | "success";
}) {
  const stateStyles = {
    default: "border-input focus-visible:border-orange focus-visible:ring-orange/20",
    error: "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
    success: "border-emerald-500 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20",
  }

  return (
    <div className="relative w-full">
      <InputPrimitive
        type={type}
        data-slot="input"
        dir="auto"
        className={cn(
          "h-12 w-full min-w-0 min-h-[48px] rounded-md border bg-transparent px-4 py-3 text-base transition-all duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground/60 md:text-sm dark:bg-input/30 dark:disabled:bg-muted dark:disabled:text-muted-foreground/50",
          stateStyles[state],
          className
        )}
        aria-invalid={state === "error"}
        {...props}
      />
      {state === "success" && (
        <CheckCircle2
          className="absolute end-3 top-1/2 -translate-y-1/2 size-5 text-emerald-500 pointer-events-none"
          aria-hidden="true"
        />
      )}
      {state === "error" && (
        <AlertCircle
          className="absolute end-3 top-1/2 -translate-y-1/2 size-5 text-destructive pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

export { Input }
