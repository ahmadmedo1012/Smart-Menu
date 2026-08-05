'use client';

import { useEffect, useState, useRef } from 'react';
import {AlertTriangle} from 'lucide-react';
import AnimatedX from '@/components/ui/x-icon';;
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface RejectionEvent {
	type: 'subscription_rejected';
	message: string;
	timestamp: string;
}

// ponytail: client polling replaces SSE — Vercel kills server streams at 300s.
const POLL_MS = 15_000;

export function UserBannerNotifier() {
	const [rejected, setRejected] = useState<RejectionEvent | null>(null);
	const [dismissed, setDismissed] = useState(false);
	const lastIdRef = useRef(0);
	const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

	useEffect(() => {
		const poll = async () => {
			try {
				const res = await fetch(`/api/user/events?sinceId=${lastIdRef.current}`);
				if (!res.ok) return;
				const json = await res.json();
				const events = json.data ?? [];
				for (const ev of events) {
					if (ev.id > lastIdRef.current) lastIdRef.current = ev.id;
					if (ev.eventType === 'subscription_rejected') {
						setRejected({ type: ev.eventType, message: ev.message ?? '', timestamp: ev.createdAt });
						setDismissed(false);
					}
				}
			} catch {
				/* transient — next tick retries */
			}
		};
		poll();
		intervalRef.current = setInterval(poll, POLL_MS);
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, []);

	if (!rejected || dismissed) return null;

	return (
		<div className="w-full">
			<AnimatePresence>
				{!dismissed && (
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ type: 'spring', stiffness: 300, damping: 25 }}
						className={cn(
							'mx-4 mt-4 rounded-xl border-2 border-destructive/30',
							'bg-gradient-to-r from-destructive/10 to-red-500/5',
							'dark:from-destructive/20 dark:to-red-500/10',
							'p-4 backdrop-blur-sm'
						)}
						role="alert"
						aria-live="assertive"
					>
						<div className="flex items-start gap-3 rtl:flex-row-reverse">
							<div className="size-10 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
								<AlertTriangle className="size-5 text-destructive" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="font-bold text-sm text-destructive">تم رفض طلب التفعيل</p>
								<p className="text-xs text-muted-foreground mt-1 leading-relaxed">
									{rejected.message}
								</p>
								<p className="text-[11px] text-muted-foreground/60 mt-2">
									يمكنك تعديل بيانات الدفع وإعادة المحاولة من صفحة الدفع
								</p>
							</div>
							<button
								onClick={() => setDismissed(true)}
								className="shrink-0 size-9 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
								aria-label="إغلاق"
							>
								<AnimatedX className="size-3.5 text-muted-foreground" />
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
