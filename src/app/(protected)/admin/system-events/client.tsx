'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { csrfFetch } from '@/lib/csrf-client';
import { Loader2, AlertCircle, Activity, FilterX, Info, TriangleAlert, XOctagon } from 'lucide-react';
import AnimatedRefreshCw from '@/components/ui/refresh-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatDate, toArabicNumber } from '@/lib/format';
import { LoadingAnnouncer } from '@/components/ui/loading-announcer';

type SystemEvent = {
	id: number;
	type: string;
	message: string;
	severity?: string;
	createdAt: string;
};

type Severity = 'info' | 'warning' | 'error' | 'critical';

const SEVERITY_ORDER: Severity[] = ['critical', 'error', 'warning', 'info'];

/** Semantic-token styles per severity — no raw Tailwind palette colors. */
const SEVERITY_STYLES: Record<Severity, { label: string; badge: string; dot: string; icon: typeof Info }> = {
	info: {
		label: 'معلومة',
		badge: 'bg-info/10 text-info dark:bg-info/20 border border-info/20',
		dot: 'bg-info',
		icon: Info,
	},
	warning: {
		label: 'تحذير',
		badge: 'bg-warning/10 text-warning-foreground/90 dark:text-warning dark:bg-warning/15 border border-warning/25',
		dot: 'bg-warning',
		icon: TriangleAlert,
	},
	error: {
		label: 'خطأ',
		badge: 'bg-destructive/10 text-destructive dark:bg-destructive/20 border border-destructive/20',
		dot: 'bg-destructive',
		icon: AlertCircle,
	},
	critical: {
		label: 'حرج',
		badge: 'bg-destructive/20 text-destructive dark:bg-destructive/30 border border-destructive/35',
		dot: 'bg-destructive animate-pulse',
		icon: XOctagon,
	},
};

function normalizeSeverity(raw: string | undefined): Severity {
	const s = (raw ?? '').toLowerCase();
	if (s === 'warning' || s === 'warn') return 'warning';
	if (s === 'error' || s === 'fatal') return 'error';
	if (s === 'critical') return 'critical';
	return 'info';
}

export function SystemEventsClient() {
	const [events, setEvents] = useState<SystemEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');

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

	const filtered = useMemo(
		() =>
			events.filter((ev) => {
				if (severityFilter === 'all') return true;
				return normalizeSeverity(ev.severity) === severityFilter;
			}),
		[events, severityFilter]
	);

	const counts = useMemo(() => {
		const c: Record<Severity | 'all', number> = { all: events.length, info: 0, warning: 0, error: 0, critical: 0 };
		for (const ev of events) c[normalizeSeverity(ev.severity)] += 1;
		return c;
	}, [events]);

	const hasFilters = severityFilter !== 'all';

	if (loading)
		return (
			<div className="flex justify-center p-12">
				<LoadingAnnouncer loading message="جارٍ تحميل أحداث النظام..." />
				<Loader2 className="size-6 animate-spin text-orange" aria-hidden="true" />
			</div>
		);
	if (error)
		return (
			<div role="alert" className="flex flex-col items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10">
				<p className="text-destructive">{error}</p>
				<button
					type="button"
					onClick={load}
					className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground hover:underline underline-offset-4"
				>
					<AnimatedRefreshCw className="size-3.5" />
					إعادة المحاولة
				</button>
			</div>
		);

	return (
		<div className="space-y-4">
			{/* Severity filter chips */}
			<div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="فلترة حسب الخطورة">
				{(['all', ...SEVERITY_ORDER] as const).map((key) => {
					const isActive = severityFilter === key;
					const label = key === 'all' ? 'الكل' : SEVERITY_STYLES[key].label;
					return (
						<button
							key={key}
							type="button"
							onClick={() => setSeverityFilter(key)}
							aria-pressed={isActive}
							className={cn(
								'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
								isActive ? 'bg-orange text-orange-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
							)}
						>
							{key !== 'all' && <span className={cn('size-1.5 rounded-full', SEVERITY_STYLES[key].dot)} aria-hidden="true" />}
							{label}
							<span className="text-xs opacity-70 tabular-nums">{toArabicNumber(counts[key])}</span>
						</button>
					);
				})}
				{hasFilters && (
					<button
						type="button"
						onClick={() => setSeverityFilter('all')}
						className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ms-1"
					>
						<FilterX className="size-3.5" aria-hidden="true" />
						مسح الفلتر
					</button>
				)}
			</div>

			<div className="rounded-lg border border-border/50">
				{filtered.length === 0 ? (
					hasFilters ? (
						<EmptyState
							icon={FilterX}
							title="لا توجد نتائج مطابقة"
							description="جرّب تغيير فلتر الخطورة أو مسحه لعرض كل الأحداث"
							action={
								<button
									type="button"
									onClick={() => setSeverityFilter('all')}
									className="inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted/80 transition-colors"
								>
									<FilterX className="size-3.5" aria-hidden="true" />
									عرض الكل
								</button>
							}
						/>
					) : (
						<EmptyState
							icon={Activity}
							title="لا توجد أحداث بعد"
							description="ستظهر أحداث النظام والتنبيهات هنا تلقائياً عند حدوثها"
						/>
					)
				) : (
					<ul className="divide-y divide-border/50">
						{filtered.map((ev) => {
							const sev = normalizeSeverity(ev.severity);
							const st = SEVERITY_STYLES[sev];
							const SevIcon = st.icon;
							return (
								<li key={ev.id} className="group flex items-start gap-3 p-4 transition-colors hover:bg-muted/20">
									<span className={cn('size-2 rounded-full shrink-0 mt-1.5', st.dot)} aria-hidden="true" />
									<span
										className={cn(
											'text-2xs font-medium px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1',
											st.badge
										)}
									>
										<SevIcon className="size-3" aria-hidden="true" />
										{st.label}
									</span>
									<span className="text-sm min-w-0 flex-1">
										{ev.message}
										<span className="sr-only"> — خطورة: {st.label}</span>
									</span>
									<time
										dateTime={ev.createdAt}
										className="text-xs text-muted-foreground whitespace-nowrap shrink-0 group-hover:text-foreground/70 transition-colors"
									>
										{formatDate(new Date(ev.createdAt))}
									</time>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}
