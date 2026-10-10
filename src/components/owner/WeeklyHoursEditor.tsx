'use client';

/**
 * r137 — محرّر ساعات الدوام الأسبوعي (الميزة 1، واجهة المالك/الأدمن).
 *
 * مشترك بين إعدادات المالك (owner/settings) وحوار الأدمن
 * (RestaurantFormDialog) — نفس الشبكة، نفس التحويلات. الأسبوع يُعرض
 * بالترتيب الليبي (السبت أولًا — LIBYAN_WEEK_ORDER) لكن التخزين/السلك
 * باتفاقية getDay (0=الأحد..6=السبت) كما في كل المنصة.
 *
 * نموذج الحالة الثلاثي لكل يوم:
 *   enabled=false → اليوم غير مهيكل (لا صف في الحمولة)
 *   enabled=true, closed=true → «مغلق طوال اليوم» (صف closed — يُحسب
 *     في «مغلق حاليًا» و«الفتح القادم» يمضي لغيره)
 *   enabled=true, closed=false → نافذة HH:MM واحدة (الوردية الثانية
 *     قرار صفر-انتفاخ موثّق: لا شيء منها). الدوام الليلي العابر لمنتصف
 *     الليل = closesAt أبكر من opensAt (يفكّه computeOpenStatus).
 *
 * التحقق: نفس عائلة 422 العربية عبر parseOpeningHoursPayload (يستدعيه
 * المالك قبل الحفظ + الخادم يفحص مجددًا). الأرقام غربية HH:MM (سياسة
 * أرقام المنصة r135) — input[type=time] يعطيها هكذا أصلًا.
 */
import { DAY_NAMES_AR, LIBYAN_WEEK_ORDER, type OpeningHoursRow } from '@/lib/opening-hours';
import { cn } from '@/lib/utils';

export type WeeklyHoursRow = {
	enabled: boolean;
	closed: boolean;
	opensAt: string;
	closesAt: string;
};

/** الحالة الفارغة: كل الأيام غير مهيكلة (الميزة نائمة). */
export function emptyWeeklyHours(): Record<number, WeeklyHoursRow> {
	const state: Record<number, WeeklyHoursRow> = {};
	for (const day of [0, 1, 2, 3, 4, 5, 6]) {
		state[day] = { enabled: false, closed: false, opensAt: '', closesAt: '' };
	}
	return state;
}

/** بناء الحالة من صفوف قاعدة البيانات (تعبئة المحرّر عند الفتح). */
export function weeklyHoursFromRows(
	rows: readonly OpeningHoursRow[] | null | undefined,
): Record<number, WeeklyHoursRow> {
	const state = emptyWeeklyHours();
	for (const row of rows ?? []) {
		if (row.dayOfWeek < 0 || row.dayOfWeek > 6) continue;
		state[row.dayOfWeek] = {
			enabled: true,
			closed: row.closed,
			opensAt: row.opensAt,
			closesAt: row.closesAt,
		};
	}
	return state;
}

/**
 * الحمولة المرسلة للخادم: الأيام المفعّلة فقط. المصفوفة الفارغة =
 * مسح كامل (إطفاء الميزة) — الحالة الفارغة غير مرئية في المنيو.
 */
export function weeklyHoursToPayload(
	state: Record<number, WeeklyHoursRow>,
): OpeningHoursRow[] {
	const rows: OpeningHoursRow[] = [];
	for (const day of [0, 1, 2, 3, 4, 5, 6]) {
		const row = state[day];
		if (!row?.enabled) continue;
		rows.push({
			dayOfWeek: day,
			closed: row.closed,
			opensAt: row.closed ? row.opensAt || '00:00' : row.opensAt,
			closesAt: row.closed ? row.closesAt || '00:00' : row.closesAt,
		});
	}
	return rows;
}

export function WeeklyHoursEditor({
	value,
	onChange,
	submitted = false,
}: {
	value: Record<number, WeeklyHoursRow>;
	onChange: (next: Record<number, WeeklyHoursRow>) => void;
	/* بعد محاولة حفظ مرفوضة: الحقول الناقصة تعلن نفسها (نمط submitted في
	   نموذج الإعدادات القائم). */
	submitted?: boolean;
}) {
	return (
		<div className="space-y-2" role="group" aria-label="ساعات الدوام الأسبوعي">
			{LIBYAN_WEEK_ORDER.map((day) => {
				const row = value[day];
				const incomplete =
					submitted && row.enabled && !row.closed && (row.opensAt === '' || row.closesAt === '');
				return (
					<div
						key={day}
						className={cn(
							'flex flex-wrap items-center gap-2.5 p-3 rounded-md border transition-colors',
							row.enabled && !row.closed
								? 'border-orange/30 bg-orange-muted/20'
								: 'border-border/20 bg-card/30',
						)}
					>
						{/* تفعيل اليوم + اسمه */}
						<label className="flex items-center gap-2.5 min-w-24 cursor-pointer">
								<input
										type="checkbox"
										checked={row.enabled}
										onChange={(e) =>
												onChange({
														...value,
														[day]: { ...row, enabled: e.target.checked },
												})
										}
										className="size-4 accent-orange"
										aria-label={`تفعيل يوم ${DAY_NAMES_AR[day]}`}
								/>
								<span className="text-sm font-medium w-14">{DAY_NAMES_AR[day]}</span>
						</label>

						{/* مغلق طوال اليوم — يظهر فقط لليوم المفعّل */}
						{row.enabled && (
								<label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
										<input
												type="checkbox"
												checked={row.closed}
												onChange={(e) =>
														onChange({
																...value,
																[day]: { ...row, closed: e.target.checked },
														})
												}
												className="size-4 accent-orange"
												aria-label={`مغلق طوال اليوم ${DAY_NAMES_AR[day]}`}
										/>
										مغلق طوال اليوم
								</label>
						)}

						{/* نافذة الوقت — تعطيل كامل لغير المفعّل أو المغلق */}
						<div className={cn('flex items-center gap-2 ms-auto', !row.enabled && 'opacity-40')}>
								<input
										type="time"
										value={row.enabled && !row.closed ? row.opensAt : ''}
										disabled={!row.enabled || row.closed}
										onChange={(e) => onChange({ ...value, [day]: { ...row, opensAt: e.target.value } })}
										aria-label={`وقت فتح ${DAY_NAMES_AR[day]}`}
										className={cn(
												'h-10 rounded-md border bg-background text-sm text-start tabular-nums px-2',
												incomplete && row.opensAt === '' ? 'border-destructive ring-1 ring-destructive/30' : 'border-border/40',
												'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
										)}
								/>
								<span className="text-muted-foreground text-sm" aria-hidden="true">
										–
								</span>
								<input
										type="time"
										value={row.enabled && !row.closed ? row.closesAt : ''}
										disabled={!row.enabled || row.closed}
										onChange={(e) => onChange({ ...value, [day]: { ...row, closesAt: e.target.value } })}
										aria-label={`وقت إغلاق ${DAY_NAMES_AR[day]}`}
										className={cn(
												'h-10 rounded-md border bg-background text-sm text-start tabular-nums px-2',
												incomplete && row.closesAt === '' ? 'border-destructive ring-1 ring-destructive/30' : 'border-border/40',
												'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
										)}
								/>
						</div>
					</div>
				);
			})}
			<p className="text-2xs text-muted-foreground mt-1">
				لإغلاق يعبر منتصف الليل: اجعل وقت الإغلاق أبكر من وقت الفتح (مثل 20:00 – 02:00)
			</p>
		</div>
	);
}
