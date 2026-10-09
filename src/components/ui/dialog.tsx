"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import AnimatedX from "@/components/ui/x-icon"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" modal {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/*
 * r131-F4 (A1 P0-10 — dialog canon): re-based on the SO r130 recipe
 * (Madarek components.css:1471-1516):
 *   · solid surface (bg-popover — the old /95 + backdrop-blur-md glass is
 *     retired), hairline border, r-xl 16px, --shadow-modal elevation.
 *   · width cap min(560px, 100% - 2rem) — was 384px (sm:max-w-sm).
 *   · the signature top-edge accent gradient hairline: a 3px
 *     transparent→accent→transparent band, inset-inline 30% (SO ships the
 *     same 3px band; the task brief said 2px — 3px is the SO/madarek value
 *     both repos ship, kept for family parity).
 *   · entrance translateY(8px) scale(.98) — was y-4/scale-95.
 *   · scrim dimming stays light: 4px blur (was blur-sm=8px in the v4 scale).
 * accent rides var(--accent-solid) (gold dark / copper light) — SM's light
 * --primary is the ink slab, which would paint the hairline ink instead of
 * the family copper.
 */
function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-40 backdrop-blur-[4px] transition-opacity duration-base ease-[cubic-bezier(0.16,1,0.3,1)]",
        "data-starting-style:opacity-0 data-ending-style:opacity-0",
        className
      )}
      style={{ backgroundColor: "var(--overlay)" }}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        aria-modal="true"
        dir="rtl"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] max-h-[90dvh] overflow-y-auto overscroll-contain -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border bg-popover p-6 text-sm text-popover-foreground shadow-[var(--shadow-modal)] outline-none sm:max-w-[560px]",
          "before:pointer-events-none before:absolute before:top-0 before:inset-x-[30%] before:z-[1] before:h-[3px] before:rounded-b-full before:bg-[linear-gradient(90deg,transparent,var(--accent-solid),transparent)]",
          "transition-[opacity,scale,translate,filter] duration-base ease-[cubic-bezier(0.16,1,0.3,1)] data-starting-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:translate-y-2",
          "data-ending-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:translate-y-2",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 end-3 min-h-[48px] min-w-[48px]"
                size="icon"
                aria-label="إغلاق"
              />
            }
          >
            <AnimatedX />
            <span className="sr-only">إغلاق</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-start", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          إغلاق
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg leading-none font-semibold",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
