'use client';

import { AlertTriangle } from 'lucide-react';

/**
 * round87-C1: shared access-denied card (was copy-pasted into 11 admin pages
 * with 3 drifting variants). Same markup as the previous dominant pattern.
 */
export function AccessDenied() {
	return (
		<div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
			<div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
				<AlertTriangle className="size-8 text-destructive" />
			</div>
			<h1 className="text-xl font-bold mb-2">غير مصرح</h1>
			<p className="text-sm text-muted-foreground max-w-xs">لا تملك الصلاحية للوصول إلى هذه الصفحة.</p>
		</div>
	);
}
