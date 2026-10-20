/**
 * W7-B2 — شفاء نصوص ميزات الخطط عند القراءة (the Smart-Order plan-claims
 * doctrine P13-2d/W6-B4: display-time heal — the DB is never rewritten by
 * the reader, legacy rows heal into truth at every seam).
 *
 * لماذا هذا الملف موجود (الحادثة الموثقة): هجرة zz_w7b_plan_feature_texts
 * (W7-B) كانت فشل-صامتًا في الإنتاج: النشر الأخضر وتقرير الصحة على SHA
 * الجديد، لكن صفوف SubscriptionPlan بقت على أكاذيبها القديمة («تقرير
 * شهري»، «API مخصص»…) — مع دليل بايتي أن حراس الاحتواء @> كانوا سيطابقون.
 * المسار الخادمي للهجرة لم يُطبّق (سبب غير قابل للرصد من الصندوق)، بينما
 * العمود نفسه يحمل أيضًا فسادًا مزدوج الترميز موثقًا: صف Pro يحوي عنصرًا
 * نصيًا هو نفسه مصفوفة JSON كاملة — كل حراس @> على العمود الخارجي
 * يفشلون بصمت. القرار: طبقة الشفاء عند القراءة (المعتمدة أسطوليًا) هي
 * الحقيقة المعروضة في كل الأحواض، وهجرة zz_w7b2 تحاول ترميم العمود نفسه؛
 * إن طُبّقت صارت هذه الطبقة no-op، وإن تكرر فشل الهجرات فكل سطح يبقى صادقًا.
 *
 * العقد:
 *   - نقية بلا prisma (تُستورد من الخادم والعميل على السواء)؛
 *   - IDEMPOTENT: صف نظيف يمر بايت-بايت؛ إعادة الشفاء على صف مُشفى لا-op؛
 *   - فك الترميز المزدوج: عنصر نصي يبدأ بـ'[' ويُفكّ إلى مصفوفة → يُدمج
 *     الداخلي في الخارجي (بلا تكرار — أول ظهور يفوز)؛
 *   - الحذف/الاستبدال: نفس قرارات W7-B الموثقة (r92: النص يتبع ما يُنفَّذ).
 */

/** الوعود التي لا يوجد لها منتج (قرارات W7-B الموثقة — إزالة لا استبدال). */
const REMOVE_LIES = new Set([
	'تقرير شهري', // Basic: لا يوجد أي تقرير مجدول في المنتج
	'برنامج ولاء متكامل', // Premium: الولاء عالمي لكل الخطط
	'QR كود مخصص', // لم يُشحن قط (حكم W6-A3/W6-B3)
	'تخصيص كامل', // التخصيص (الثيم/الشعار/المعرض) عالمي
	'ولاء كامل', // Enterprise: عالمي (غير متمايز)
	'API مخصص', // Enterprise: لا يوجد أي API مخصص
]);

/** أسماء غامضة/واعدة بما لا يعمل → الاسم الحقيقي المُنفَّذ (بوابة W7-B). */
const RENAME: Record<string, string> = {
	'ولاء متقدم': 'برنامج إحالات', // المُنفَّذ فعلًا: بوابة الاحترافية+ في loyalty/referral
	'دعم 24/7': 'دعم فني فوري', // لا روتة دعم 24/7 في المنظومة (قانون r144 في smart-link) — صياغة البذرة
};

/** فك عنصر واحد: نص يُفكّ إلى مصفوفة → عناصرها؛ غير ذلك → هو نفسه. */
function unwrapElement(el: unknown, depth: number): unknown[] {
	if (typeof el !== 'string' || depth <= 0 || !el.startsWith('[')) return [el];
	try {
		const parsed: unknown = JSON.parse(el);
		if (Array.isArray(parsed)) {
			// دمج متكرر بمستوى واحد إضافي فقط (حارس العمق — لا شفاء لا نهائي)
			return parsed.flatMap((inner) => unwrapElement(inner, depth - 1));
		}
	} catch {
		/* نص عادي يبدأ بـ'[' — ليس JSON — يمر كما هو */
	}
	return [el];
}

/** العناصر المشفاة لصف خطة واحدة (فك الترميز ثم الحذف ثم الاستبدال ثم التكرار). */
export function healPlanFeatures(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	const out: string[] = [];
	const seen = new Set<string>();
	const push = (v: unknown) => {
		if (typeof v !== 'string') return;
		if (REMOVE_LIES.has(v)) return;
		const final = RENAME[v] ?? v;
		if (seen.has(final)) return;
		seen.add(final);
		out.push(final);
	};
	for (const el of raw) {
		for (const unwrapped of unwrapElement(el, 2)) push(unwrapped);
	}
	return out;
}
