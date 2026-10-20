import { describe, it, expect } from 'vitest';
import { healPlanFeatures } from '@/lib/plan-features-heal';

/**
 * W7-B2 — عقد طبقة الشفاء عند القراءة (الحادثة: هجرة zz_w7b لم تُطبّق
 * في الإنتاج + عمود Pro يحمل ترميزًا مزدوجًا موثقًا).
 * كل الحالات أدناه من القيم الحية المُوثقة بايتيًا من استجابة
 * menu.smart-link.ly/api/plans لحظة الحادثة.
 */

describe('W7-B2 — healPlanFeatures (شفاء نصوص الخطط عند القراءة)', () => {
	it('صف نظيف يمر بايت-بايت (البذرة الحالية — صفر تدخل)', () => {
		const free = ['منيو رقمي تفاعلي', '10 أصناف', 'طلبات واتساب', 'إحصائيات أساسية'];
		expect(healPlanFeatures(free)).toEqual(free);
		const premium = ['جميع ميزات الأساسية', 'أصناف حتى 100', 'إحصاءات متقدمة', 'دعم فني فوري'];
		expect(healPlanFeatures(premium)).toEqual(premium);
	});

	it('الصف الحي المجاني في الإنتاج: إزالة «تقرير شهري» وبقاء الصادقات', () => {
		const liveBasic = ['منيو رقمي', '50 صنف', 'طلبات حتى 500', 'برنامج ولاء', 'تقرير شهري', 'دعم فني'];
		expect(healPlanFeatures(liveBasic)).toEqual(['منيو رقمي', '50 صنف', 'طلبات حتى 500', 'برنامج ولاء', 'دعم فني']);
	});

	it('الصف الحي للشركات: «API مخصص» و«ولاء كامل» يُحذفان و«دعم 24/7» تُستبدل', () => {
		const liveEnterprise = ['منيوهات حتى 10', 'أصناف حتى 9999', 'طلبات حتى 99999', 'ولاء كامل', 'API مخصص', 'دعم 24/7'];
		expect(healPlanFeatures(liveEnterprise)).toEqual([
			'منيوهات حتى 10',
			'أصناف حتى 9999',
			'طلبات حتى 99999',
			'دعم فني فوري',
		]);
	});

	it('فساد الترميز المزدوج الحي (صف Pro): العنصر النصي-المصفوفة يُفكّ ويُدمج بلا تكرار', () => {
		// القيمة الحية الحرفية الموثقة: عنصر واحد نصي = مصفوفة JSON كاملة + «تصدير CSV» خارجية
		const blob = '["حتى 3 منيوهات","أصناف حتى 9999","طلبات حتى 99999","برنامج إحالات","إحصاءات متقدمة","QR كود مخصص","دعم فوري","تخصيص كامل"]';
		const livePro = [blob, 'تصدير CSV'];
		const healed = healPlanFeatures(livePro);
		expect(healed).toEqual([
			'حتى 3 منيوهات',
			'أصناف حتى 9999',
			'طلبات حتى 99999',
			'برنامج إحالات',
			'إحصاءات متقدمة',
			'دعم فوري',
			'تصدير CSV',
		]);
		// الأكاذيب الداخلية (QR كود مخصص + تخصيص كامل) حُذفت، والصادقة (تصدير CSV) بلا تكرار
		expect(healed.filter((f) => f === 'تصدير CSV')).toHaveLength(1);
	});

	it('الاستبدال: «ولاء متقدم» → «برنامج إحالات» (الميزة الحقيقية خلف البوابة)', () => {
		expect(healPlanFeatures(['ولاء متقدم'])).toEqual(['برنامج إحالات']);
	});

	it('IDEMPOTENT: شفاء الشفاء = الشفاء (إعادة التشغيل no-op)', () => {
		const livePro = ['["ولاء متقدم","تصدير CSV"]', 'API مخصص'];
		const once = healPlanFeatures(livePro);
		const twice = healPlanFeatures(once);
		expect(twice).toEqual(once);
	});

	it('نص يبدأ بـ[ لكنه ليس JSON يمر كما هو (لا بلع أعمى)', () => {
		expect(healFeatures(['[ملاحظة] شيء عادي'])).toEqual(['[ملاحظة] شيء عادي']);
	});

	it('مدخلات غير قابلة للشفاء: مصفوفة غير نصية أو مدخل غير مصفوفة → فراغ/تجاهل الآخر', () => {
		expect(healPlanFeatures('not-array')).toEqual([]);
		expect(healPlanFeatures([42, null, 'صادق'])).toEqual(['صادق']);
	});
});

// الرابط المحلي للنص غير-JSON (فك حماية الاسم داخل نفس الملف للاختبار)
function healFeatures(input: string[]): string[] {
	return healPlanFeatures(input);
}
