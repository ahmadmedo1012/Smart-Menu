import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * r131-F4 (A1 P0-5/P1-11 — fleet ruling "status=solid pastel 11/600 tnum"):
 * status variants are SOLID pastel grounds + -deep ink (madarek tokens.css
 * badge family — green→mint, brand→copper, red→rose, amber→yellow, sky→sky;
 * the tokens flip per theme: night = deep-space ground + luminous deep ink,
 * light = pastel ground + deep ink). The old /15 translucent washes + /25
 * borders rendered as ghost chips next to the SO solid twins.
 * Base type: 11px (text-2xs) / 600 / tabular-nums; pill radius rounded-full
 * (was rounded-4xl). `gradient` is retired to the solid copper pair and
 * `saffron` maps onto the yellow family (same warm hue, pastel tokens) —
 * both keep their names so existing variant props keep compiling.
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-2xs font-semibold tabular-nums whitespace-nowrap transition-[color,background-color,border-color,box-shadow] duration-fast focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-(--c-rose-bg) text-(--c-rose-deep) [a]:hover:opacity-90",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        gold: "bg-(--c-copper-bg) text-(--c-copper-deep) [a]:hover:opacity-90",
        success:
          "bg-(--c-mint-bg) text-(--c-mint-deep) [a]:hover:opacity-90",
        warning:
          "bg-(--c-yellow-bg) text-(--c-yellow-deep) [a]:hover:opacity-90",
        info: "bg-(--c-sky-bg) text-(--c-sky-deep) [a]:hover:opacity-90",
        saffron:
          "bg-(--c-yellow-bg) text-(--c-yellow-deep) [a]:hover:opacity-90",
        /* r131-F4: retired gradient (stripes/glow ban) — solid copper alias */
        gradient:
          "bg-(--c-copper-bg) text-(--c-copper-deep) [a]:hover:opacity-90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
