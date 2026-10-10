/**
 * r137 — ساعات الدوام المهيكلة (الميزة 1).
 *
 * مصدر الحقيقة الواحد لحساب «مفتوح الآن / مغلق حاليًا» + تحقق حمولة
 * ساعات الدوام الواردة من المحرّرات (المالك/الأدمن). نقي بلا React ولا
 * Prisma — يُستهلك من العميل (شارة MenuHero) ومن مسارات API.
 *
 * قرار الصفر-انتفاخ الموثّق: نافذة واحدة يوميًا. الدوام الليلي العابر
 * لمنتصف الليل يُمثَّل بـ closesAt < opensAt (مثل 20:00 → 02:00):
 *   * نافذة عادية (close > open): مفتوح إذا open <= الآن < close.
 *   * نافذة عابرة (close <= open): مفتوح إذا الآن >= open أو الآن < close
 *     (الحصة بعد منتصف الليل تُحسب مفتوحة).
 *   * open === close (مثل 00:00 → 00:00): تفسَّر دوامًا متواصلًا 24
 *     ساعة — تمثيل صادق لما يكتبه أصحاب المطاعم المتواصلة.
 *
 * حدود الدقيقة: opensAt شاملة (يفتح عند 16:00 بالضبط) وclosesAt حصرية
 * (يُعدّ مغلقًا عند 23:00 بالضبط) — مطابقة نص الشارة «يغلق 23:00».
 *
 * المنطقة الزمنية: Africa/Tripoli بلا استثناء (الإزاحة الثابتة UTC+2
 * بلا توقيت صيفي). tripoliWallClock يعيد استخدام نمط r133-A12 M2
 * (formatDateTripoli في lib/format.ts): Intl بـ timeZone صريح على
 * الخادم والعميل معًا — لكن استدعاء الحساب نفسه عميلي فقط لأن صفحة
 * المنيو مخبأة ISR (رuling القلب: لا تُحسب الحالة على الخادم أبدًا).
 */

/** يوم الدوام باتفاقية JS getDay: 0=الأحد .. 6=السبت. */
export type OpeningHoursRow = {
        dayOfWeek: number;
        closed: boolean;
        opensAt: string;
        closesAt: string;
};

/** أسماء الأيام بالعربية مفهرسة باتفاقية getDay (0=الأحد). */
export const DAY_NAMES_AR: readonly string[] = [
        'الأحد',
        'الإثنين',
        'الثلاثاء',
        'الأربعاء',
        'الخميس',
        'الجمعة',
        'السبت',
] as const;

/**
 * ترتيب عرض الأسبوع الليبي: السبت أولًا (نهاية الأسبوع الجمعة/السبت).
 * المحرّرات وحدها تستخدمه — التخزين يبقى باتفاقية getDay.
 */
export const LIBYAN_WEEK_ORDER: readonly number[] = [6, 0, 1, 2, 3, 4, 5] as const;

/** صيغة HH:MM بنظام 24 ساعة (أرقام غربية — سياسة أرقام المنصة r135). */
export const HH_MM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** «HH:MM» → دقائق من منتصف الليل (مطابقة مضمونة مسبقًا بـ HH_MM_RE). */
export function minutesOfDay(hhMm: string): number {
        return Number(hhMm.slice(0, 2)) * 60 + Number(hhMm.slice(3, 5));
}

/** ساعة طرابلس الحالية كـ { يوم الأسبوع، دقائق من منتصف الليل }. */
export type TripoliWallClock = { dayOfWeek: number; minutes: number };

const TRIPOLI_WEEKDAY_INDEX: Readonly<Record<string, number>> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
};

/**
 * قراءة ساعة الحائط بتوقيت طرابلس من أي Date (خادم بـ TZ=UTC أو جهاز
 * زبون بأي منطقة) — نفس عائلة formatDateTripoli (r133-A12 M2):
 * Intl بـ timeZone: 'Africa/Tripoli' بدل الحساب اليدوي بالإزاحة.
 */
export function tripoliWallClock(now: Date = new Date()): TripoliWallClock {
        const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Africa/Tripoli',
                weekday: 'short',
                hour: 'numeric',
                minute: '2-digit',
                hourCycle: 'h23',
        }).formatToParts(now);
        const part = (type: Intl.DateTimeFormatPartTypes) =>
                parts.find((p) => p.type === type)?.value ?? '';
        const dayOfWeek = TRIPOLI_WEEKDAY_INDEX[part('weekday')] ?? 0;
        const minutes = Number(part('hour')) * 60 + Number(part('minute'));
        return { dayOfWeek, minutes };
}

/**
 * حالة «مفتوح الآن» من صفوف ساعات الدوام + ساعة طرابلس.
 *
 * لا صفوف إطلاقًا (أو كلها بـ dayOfWeek غير صالح) → null: الميزة نائمة،
 * لا شارة (غياب صادق — workingHours النصي الحر يستمر كما هو).
 *
 * مفتوح → closesAtLabel (HH:MM يُعرض كما هو، أرقام غربية). ذيل نافذة
 * الأمس العابرة لمنتصف الليل يُحسب مفتوحًا (السبت 20:00–02:00 يمتد
 * إلى فجر الأحد).
 * مغلق → nextOpenLabel («يفتح اليوم 16:00» / «يفتح السبت 16:00» —
 * «السبت» قد يكون الأسبوع القادم لنافذة اليوم الوحيدة الماضية)؛ أو
 * null إذا لا يوم مفتوح في الأسبوع كله (أسبوع مُهيكل كله «مغلق» =
 * الشارة تقول «مغلق حاليًا» بلا وعد زائف، لا تختفي).
 */
export type OpenStatus =
        | { isOpen: true; closesAtLabel: string }
        | { isOpen: false; nextOpenLabel: string | null };

export function computeOpenStatus(
        hours: readonly OpeningHoursRow[] | null | undefined,
        now: TripoliWallClock,
): OpenStatus | null {
        if (!hours || hours.length === 0) return null;

        // يوم → نافذة قابلة للاستخدام. اليوم «مغلق طوال اليوم» أو الصف
        // التالف (أوقاط بلا صيغة) لا يساهم بشيء — بيانات الكتابة متحققة
        // (parseOpeningHoursPayload) لكن صفًا قديمًا/يدويًا لا يحقق الشارة
        // أبدًا: السكوت أصدق من الرسم على بيانات ناقصة.
        // «اليوم المهيكل» = صف بـ dayOfWeek صالح (مغلقًا كان أو نافذة) —
        // أساس نشاط الميزة: أسبوع مُهيكل كله «مغلق» يعرض «مغلق حاليًا»،
        // لا يُخفي الشارة (المالك قال شيئًا صريحًا — نعرضه).
        const windows = new Map<number, { open: number; close: number; opensAt: string; closesAt: string }>();
        let configuredDays = 0;
        for (const row of hours) {
                if (
                        !row ||
                        typeof row.dayOfWeek !== 'number' ||
                        row.dayOfWeek < 0 ||
                        row.dayOfWeek > 6
                )
                        continue;
                configuredDays += 1;
                if (row.closed) continue;
                if (!HH_MM_RE.test(row.opensAt) || !HH_MM_RE.test(row.closesAt)) continue;
                windows.set(row.dayOfWeek, {
                        open: minutesOfDay(row.opensAt),
                        close: minutesOfDay(row.closesAt),
                        opensAt: row.opensAt,
                        closesAt: row.closesAt,
                });
        }
        if (configuredDays === 0) return null; // الميزة نائمة — لا شارة

        // هل النافذة تغطي اللحظة؟ (الحدود: open شاملة، close حصرية)
        const coversNow = (w: { open: number; close: number }, minutes: number): boolean =>
                w.close > w.open
                        ? minutes >= w.open && minutes < w.close
                        : minutes >= w.open || minutes < w.close; // عبور منتصف الليل (أو 24 ساعة)

        // مفتوح الآن؟ نافذة اليوم — أو ذيل نافذة الأمس العابرة لمنتصف الليل
        // (السبت 20:00–02:00 تُبقي المطعم مفتوحًا بعد منتصف ليل الأحد).
        const today = windows.get(now.dayOfWeek);
        if (today && coversNow(today, now.minutes)) {
                return { isOpen: true, closesAtLabel: today.closesAt };
        }
        const yesterday = windows.get((now.dayOfWeek + 6) % 7);
        if (yesterday && yesterday.close <= yesterday.open && now.minutes < yesterday.close) {
                return { isOpen: true, closesAtLabel: yesterday.closesAt };
        }

        // مغلق الآن — أول فتح قادم: اليوم (إن لم يأتِ وقته بعد)، ثم 7 أيام
        // كاملة (offset 7 = اليوم نفسه الأسبوع القادم: نافذة السبت الوحيدة
        // التي مضت تفتح «السبت» القادم، لا «لا شيء»).
        for (let offset = 0; offset <= 7; offset++) {
                const day = (now.dayOfWeek + offset) % 7;
                const w = windows.get(day);
                if (!w) continue;
                if (offset === 0) {
                        // نافذة اليوم بدأت وانتهت (أو لم تبدأ) — لا تعاد ضمن «القادم»
                        // إلا إذا كان فتحها لم يحن بعد.
                        if (w.open > now.minutes && !coversNow(w, now.minutes)) {
                                return { isOpen: false, nextOpenLabel: `يفتح اليوم ${w.opensAt}` };
                        }
                        continue;
                }
                return {
                        isOpen: false,
                        nextOpenLabel: `يفتح ${DAY_NAMES_AR[day]} ${w.opensAt}`,
                };
        }
        // لا يوم مفتوح في الأسبوع كله — مغلق بلا وعد.
        return { isOpen: false, nextOpenLabel: null };
}

/**
 * تحقق حمولة ساعات الدوام الواردة من المحرّرات (settings PUT و
 * restaurants POST/PUT). نقي ومشترك — نفس الرسائل العربية في كل المسارات.
 *
 * المصفوفة الفارغة مشروعة = إطفاء الميزة (حذف كل الصفوف).
 * اليوم «مغلق» يقبل وقتين فارغين (يُخزنان 00:00 — العمود NOT NULL
 * وcomputeOpenStatus يتخطى المغلق أصلًا).
 */
export type ParsedOpeningHours = OpeningHoursRow;

export function parseOpeningHoursPayload(
        input: unknown,
): { ok: true; rows: ParsedOpeningHours[] } | { ok: false; error: string } {
        if (input === undefined || input === null) return { ok: true, rows: [] };
        if (!Array.isArray(input)) return { ok: false, error: 'ساعات الدوام غير صالحة — مصفوفة متوقعة' };
        if (input.length > 7) return { ok: false, error: 'ساعات الدوام لا تتجاوز 7 أيام' };

        const seen = new Set<number>();
        const rows: ParsedOpeningHours[] = [];
        for (const raw of input) {
                if (typeof raw !== 'object' || raw === null) {
                        return { ok: false, error: 'صيغة يوم الدوام غير صالحة' };
                }
                const item = raw as Record<string, unknown>;
                const dayOfWeek = item.dayOfWeek;
                if (typeof dayOfWeek !== 'number' || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
                        return { ok: false, error: 'يوم غير صالح — القيم المسموحة 0-6 (0=الأحد)' };
                }
                if (seen.has(dayOfWeek)) {
                        return { ok: false, error: `يوم مكرر: ${DAY_NAMES_AR[dayOfWeek]}` };
                }
                seen.add(dayOfWeek);

                const closed = item.closed === true;
                const opensAt = typeof item.opensAt === 'string' ? item.opensAt : '';
                const closesAt = typeof item.closesAt === 'string' ? item.closesAt : '';

                if (!closed) {
                        if (!HH_MM_RE.test(opensAt) || !HH_MM_RE.test(closesAt)) {
                                return {
                                        ok: false,
                                        error: `وقت ${DAY_NAMES_AR[dayOfWeek]} غير صالح — استخدم صيغة 24 ساعة مثل 16:30`,
                                };
                        }
                }
                // اليوم المغلق بلا وقتين → 00:00 شكلية (العمودان NOT NULL،
                // والنافذة تتجاهل المغلق في الحساب).
                rows.push({
                        dayOfWeek,
                        closed,
                        opensAt: closed ? (HH_MM_RE.test(opensAt) ? opensAt : '00:00') : opensAt,
                        closesAt: closed ? (HH_MM_RE.test(closesAt) ? closesAt : '00:00') : closesAt,
                });
        }
        return { ok: true, rows };
}

/**
 * سطر ملخص الدوام لصفحة الطباعة: «السبت: 16:00–23:00 · الجمعة: مغلق».
 * الأيام غير المهيكلة لا تُذكر (الغياب الصادق)؛ لا صفوف → null.
 */
export function formatHoursForPrint(hours: readonly OpeningHoursRow[] | null | undefined): string | null {
        if (!hours || hours.length === 0) return null;
        const parts: string[] = [];
        for (const day of LIBYAN_WEEK_ORDER) {
                const row = hours.find((h) => h.dayOfWeek === day);
                if (!row) continue;
                if (row.closed) {
                        parts.push(`${DAY_NAMES_AR[day]}: مغلق`);
                } else if (HH_MM_RE.test(row.opensAt) && HH_MM_RE.test(row.closesAt)) {
                        parts.push(`${DAY_NAMES_AR[day]}: ${row.opensAt}–${row.closesAt}`);
                }
                // صف تالف → يوم مسكوت عنه (نفس سياسة computeOpenStatus)
        }
        return parts.length > 0 ? parts.join(' · ') : null;
}
