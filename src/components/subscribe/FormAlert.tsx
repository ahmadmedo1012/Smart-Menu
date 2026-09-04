'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Calm inline server-error banner rendered above the form.
 * Non-destructive tone: explains, then offers a retry — never a dead end.
 */
export function FormAlert({
	message,
	onRetry,
	retrying = false,
}: {
	message: string;
	onRetry?: () => void;
	retrying?: boolean;
}) {
	return (
		<div
			role="alert"
			className="animate-fade-in flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 mb-6"
		>
			<AlertTriangle className="size-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
			<div className="flex-1 min-w-0">
				<p className="text-sm text-foreground/90 leading-relaxed">{message}</p>
				{onRetry && (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={onRetry}
						disabled={retrying}
						className="mt-1 -ms-2 h-7 text-xs text-muted-foreground"
					>
						{retrying ? (
							<span className="flex items-center gap-1.5">
								<Loader2 className="size-3 animate-spin" /> جاري إعادة المحاولة...
							</span>
						) : (
							'إعادة المحاولة'
						)}
					</Button>
				)}
			</div>
		</div>
	);
}
