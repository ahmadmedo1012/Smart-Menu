'use client';

import { useEffect, useState, useCallback } from 'react';
import { csrfFetch } from '@/lib/csrf-client';
import { Loader2 } from 'lucide-react';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';

type SystemEvent = {
	id: number;
	type: string;
	message: string;
	createdAt: string;
};

export function SystemEventsClient() {
	const [events, setEvents] = useState<SystemEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const load = useCallback(() => {
		setLoading(true);
		setError('');
		csrfFetch('/api/admin/system-events')
			.then((r) => r.json())
			.then((d) => setEvents(d.events ?? d.data?.data ?? d.data ?? []))
			.catch(() => setError('فشل تحميل أحداث النظام'))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	if (loading)
		return (
			<div className="flex justify-center p-12">
				<Loader2 className="size-6 animate-spin text-orange" />
			</div>
		);
	if (error)
		return (
			<div className="flex flex-col items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10">
				<p className="text-destructive">{error}</p>
				<button
					type="button"
					onClick={load}
					className="inline-flex items-center gap-1.5 text-sm font-medium text-orange hover:underline underline-offset-4"
				>
					<AnimatedRefreshCw className="size-3.5" />
					إعادة المحاولة
				</button>
			</div>
		);

	return (
		<div className="rounded-lg border border-border/50">
			{events.length === 0 ? (
				<div className="p-8 text-center text-muted-foreground">لا توجد أحداث بعد</div>
			) : (
				<div className="divide-y divide-border/50">
					{events.map((ev) => (
						<div key={ev.id} className="flex items-start gap-3 p-4">
							<span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
								{new Date(ev.createdAt).toLocaleString('ar-LY')}
							</span>
							<span className="text-xs font-medium px-1.5 py-0.5 rounded bg-muted shrink-0">
								{ev.type}
							</span>
							<span className="text-sm">{ev.message}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
