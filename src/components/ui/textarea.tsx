import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * r131-F4: rides the same canonical input recipe as Input (SO r130 twin):
 * radius 10 (rounded-md), 16px font floor at every breakpoint (text-[16px] —
 * SM remaps --text-base to 15px, so the iOS-zoom floor is pinned explicitly),
 * placeholder = the AA faint tier --placeholder-text (A7 P1-1), focus =
 * state border + the ONE 3px/22% halo (the old ring-2/ring-/40 double
 * indicator is retired), error = destructive border + destructive halo.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-md border border-input hover:border-(--border-strong) bg-transparent px-4 py-3 text-[16px] leading-[1.65] shadow-xs transition-[color,background-color,border-color,box-shadow] duration-fast outline-none placeholder:text-placeholder-text focus-visible:border-ring focus-visible:shadow-[var(--state-input-focus-halo)] disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:shadow-[var(--state-input-error-halo)] dark:bg-input/30 dark:disabled:opacity-60 dark:aria-invalid:border-destructive/60",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
