/**
 * P42-4a — نطاق حجب الدفعات المعلقة (r93 semantics, app-level probes).
 *
 * r93 وسّعت نموذج الاشتراك إلى «اشتراك لكل مطعم»، وقيد قاعدة البيانات
 * تبعه: الفهرس الفريد الجزئي SubscriptionPayment_pending_user_restaurant_unique
 * (هجرة zz_round93_pending_payment_scope) على
 *   ("userId", COALESCE(metadata->>'upgradeRestaurantId', '')) WHERE status='pending'
 * أي أن كل دفعة معلقة تملك «نطاق مطعم» واحدًا:
 *   - دفعة ترقية → المطعم الوحيد في metadata.upgradeRestaurantId
 *   - دفعة اشتراك جديد (لا upgradeRestaurantId) → الدلو '' (ضمانة r90:
 *     طلب اشتراك-جديد معلق واحد لكل مستخدم — COALESCE('') يسدّ ثقب
 *     NULL-distinct لدفعات بلا مطعم)
 *
 * المساران كانا قبيل هذا الإصلاح يحجبان على أي دفعة معلقة للمستخدم
 * (findFirst userId+pending): دفعة ترقية معلقة على المطعم أ كانت تحجب شراء
 * منيوهات أو ترقية المطعم ب — تناقض مباشر مع دلالات r93 ومع تعريف
 * الفهرس نفسه (الذي يسمح صراحةً بنفس المستخدم + مطعم مختلف).
 *
 * المجسّات هنا تحاكي حرفيًا ما يرفضه الفهرس بـ P2002 — لا سياسة جديدة
 * تُخترع: نفس زوج الفهرس، نفس الحدود.
 */

/**
 * Minimal structural type for the scope probe — dependency-injected like
 * PendingSlugPaymentChecker في validation.ts (يحفظ الملف خاليًا من prisma).
 */
interface PendingScopeDb {
	subscriptionPayment: {
		findMany: (args: {
			where: { userId: number; status: 'pending' };
			select: { id: true; metadata: true };
		}) => Promise<Array<{ id: number; metadata: unknown }>>;
	};
}

/**
 * نطاق مطعم الدفعة المعلقة: رقم → دفعة ترقية على ذلك المطعم؛
 * null → دلو الاشتراك-الجديد ('' في تعبير الفهرس).
 *
 * غياب المفتاح وJSON-null كلاهما '' عند COALESCE — لذا كلاهما null هنا
 * (== null يلتقط القيمتين). المعرّف الحقيقي من zod عدد موجب أبدًا لا 0.
 */
export function pendingPaymentRestaurantScope(metadata: unknown): number | null {
	if (metadata == null || typeof metadata !== 'object') return null;
	const scope = (metadata as { upgradeRestaurantId?: unknown }).upgradeRestaurantId;
	return scope == null ? null : Number(scope);
}

/**
 * هل لدى المستخدم دفعة «اشتراك جديد» معلقة (دلو '')؟
 *
 * هذا هو الصف الوحيد الذي يجوز أن يحجب POST /api/subscriptions — طلب
 * الاشتراك الجديد نفسه. دفعات الترقية المعلقة تخص مطاعمها وحدها ولا
 * تحجب شراء المنيوهات (الفهرس يسمح بالزوج (userId,'') مقابل (userId,'B')).
 *
 * Prisma لا يعبّر عن «المفتاح غائب» في فلاتر مسار JSON، والفهرس يفعل
 * ذلك بتعبير COALESCE — لذا findMany (بضع صفوف معلقة حصرًا: الفهرس
 * يقيد معلقًا واحدًا لكل (مستخدم/مطعم)) ثم فرز JS يطابق التعبير حرفيًا.
 */
export async function findPendingNewSubscriptionPayment(
	userId: number,
	db: PendingScopeDb
): Promise<{ id: number } | null> {
	const pendings = await db.subscriptionPayment.findMany({
		where: { userId, status: 'pending' },
		select: { id: true, metadata: true },
	});
	return pendings.find((p) => pendingPaymentRestaurantScope(p.metadata) === null) ?? null;
}
