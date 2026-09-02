import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Unified empty-state block: muted icon ring, centered Arabic copy, optional CTA.
 * RTL-first by construction (centered text, no physical margins).
 */
function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
	...props
}: React.ComponentProps<"div"> & {
	/** Lucide icon rendered inside the faded ring. */
	icon: LucideIcon;
	title: string;
	description?: string;
	action?: React.ReactNode;
}) {
	return (
		<div
			data-slot="empty-state"
			className={cn(
				"flex flex-col items-center justify-center gap-2 px-4 py-12 text-center",
				className
			)}
			{...props}
		>
			<span
				data-slot="empty-state-icon"
				className="flex size-16 items-center justify-center rounded-2xl border border-orange/20 bg-orange/8 text-orange shadow-sm"
				aria-hidden="true"
			>
				<Icon className="size-7" />
			</span>
			<p data-slot="empty-state-title" className="mt-1 text-sm font-bold text-foreground">
				{title}
			</p>
			{description ? (
				<p
					data-slot="empty-state-description"
					className="max-w-xs text-xs leading-relaxed text-muted-foreground"
				>
					{description}
				</p>
			) : null}
			{action ? <div data-slot="empty-state-action" className="mt-3">{action}</div> : null}
		</div>
	)
}

export { EmptyState }
