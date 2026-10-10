/**
 * r137 — مسامير رياضيات رسوم التوصيل/الحد الأدنى (الميزة 2).
 *
 * نفس الحقيقة المالية المشتركة بين الواجهة (تسمية الخيار، سطر الرسوم،
 * بوابة الحد الأدنى في /cart) والخادم (فرض POST /api/orders). الأرقام
 * غربية عبر formatPrice (سياسة أرقام المنصة — درس r135).
 */
import { describe, it, expect } from 'vitest';
import {
	deliveryFeeFor,
	deliveryFeeLabel,
	hasDeliveryFee,
	isBelowMinOrder,
	minOrderMessage,
	parseDeliveryAmount,
} from '@/lib/delivery-meta';

describe('deliveryFeeFor — استحقاق الرسوم', () => {
	it('التوصيل + رسوم موجودة → الرسوم', () => {
		expect(deliveryFeeFor('delivery', { fee: 5, minOrder: null })).toBe(5);
		expect(deliveryFeeFor('delivery', { fee: 5.5, minOrder: 20 })).toBe(5.5);
	});

	it('غير التوصيل (داخل/سفري) → صفر دائماً', () => {
		expect(deliveryFeeFor('inside', { fee: 5, minOrder: null })).toBe(0);
		expect(deliveryFeeFor('takeaway', { fee: 5, minOrder: null })).toBe(0);
	});

	it('الميزة مطفأة (null) أو رسوم 0 مخزنة → صفر (لا ضجيج بلا معلومة)', () => {
		expect(deliveryFeeFor('delivery', { fee: null, minOrder: null })).toBe(0);
		expect(deliveryFeeFor('delivery', null)).toBe(0);
		expect(deliveryFeeFor('delivery', { fee: 0, minOrder: null })).toBe(0);
	});
});

describe('isBelowMinOrder — بوابة الحد الأدنى', () => {
	it('توصيل وسلة دون الحد → true', () => {
		expect(isBelowMinOrder(19.9, 'delivery', { fee: null, minOrder: 20 })).toBe(true);
	});

	it('السلة عند الحد بالضبط → ليست دونه (الحد أدنى لا حصرًا)', () => {
		expect(isBelowMinOrder(20, 'delivery', { fee: null, minOrder: 20 })).toBe(false);
	});

	it('غير التوصيل أو الحد مطفأ → false', () => {
		expect(isBelowMinOrder(5, 'inside', { fee: null, minOrder: 20 })).toBe(false);
		expect(isBelowMinOrder(5, 'takeaway', { fee: null, minOrder: 20 })).toBe(false);
		expect(isBelowMinOrder(5, 'delivery', { fee: null, minOrder: null })).toBe(false);
		expect(isBelowMinOrder(5, 'delivery', { fee: 5, minOrder: 0 })).toBe(false);
	});
});

describe('النصوص العربية — نفس العبارات في الواجهة و422 الخادم', () => {
	it('minOrderMessage: «الحد الأدنى لطلب التوصيل 20 د.ل» (رقم غربي منسق)', () => {
		expect(minOrderMessage(20)).toBe('الحد الأدنى لطلب التوصيل 20 د.ل');
		expect(minOrderMessage(20.5)).toBe('الحد الأدنى لطلب التوصيل 20.5 د.ل');
	});

	it('deliveryFeeLabel: «التوصيل (5 د.ل رسومًا)» — الكسر يبقى كسرًا', () => {
		expect(deliveryFeeLabel(5)).toBe('التوصيل (5 د.ل رسومًا)');
		expect(deliveryFeeLabel(5.5)).toBe('التوصيل (5.5 د.ل رسومًا)');
	});

	it('hasDeliveryFee: القيمة السالبة/الصفرية/المفقودة = لا عرض', () => {
		expect(hasDeliveryFee({ fee: 5, minOrder: null })).toBe(true);
		expect(hasDeliveryFee({ fee: 0, minOrder: null })).toBe(false);
		expect(hasDeliveryFee({ fee: null, minOrder: null })).toBe(false);
		expect(hasDeliveryFee(null)).toBe(false);
	});
});

describe('parseDeliveryAmount — تطبيع إدخال المالك/الأدمن', () => {
	it('الفراغ/null → إطفاء (null)', () => {
		expect(parseDeliveryAmount('')).toEqual({ ok: true, value: null });
		expect(parseDeliveryAmount(null)).toEqual({ ok: true, value: null });
		expect(parseDeliveryAmount(undefined)).toEqual({ ok: true, value: null });
		expect(parseDeliveryAmount('   ')).toEqual({ ok: true, value: null });
	});

	it('أرقام نظيفة: سلسلة أو رقم', () => {
		expect(parseDeliveryAmount('5')).toEqual({ ok: true, value: 5 });
		expect(parseDeliveryAmount('5.5')).toEqual({ ok: true, value: 5.5 });
		expect(parseDeliveryAmount(5)).toEqual({ ok: true, value: 5 });
		expect(parseDeliveryAmount(12.25)).toEqual({ ok: true, value: 12.25 });
	});

	it('متسامح مع الأرقام الشرقية والفاصلة العربية (عائلة تطبيع r133/r136)', () => {
		expect(parseDeliveryAmount('٥')).toEqual({ ok: true, value: 5 });
		expect(parseDeliveryAmount('٥,٥')).toEqual({ ok: true, value: 5.5 });
		expect(parseDeliveryAmount('5,5')).toEqual({ ok: true, value: 5.5 });
		expect(parseDeliveryAmount(' 5 ')).toEqual({ ok: true, value: 5 });
	});

	it('التقريب لمنزلتين (عمود Decimal(10,2) — لا ثالثة)', () => {
		expect(parseDeliveryAmount('5.555')).toEqual({ ok: true, value: 5.56 });
		expect(parseDeliveryAmount(2.345)).toEqual({ ok: true, value: 2.35 });
	});

	it('الرفض: سالب / غير رقمي / ضخم', () => {
		expect(parseDeliveryAmount('-1').ok).toBe(false);
		expect(parseDeliveryAmount('abc').ok).toBe(false);
		expect(parseDeliveryAmount('999999999').ok).toBe(false);
		expect(parseDeliveryAmount(Number.NaN).ok).toBe(false);
		expect(parseDeliveryAmount(true).ok).toBe(false);
	});
});

describe('رياضيات المال الكاملة — الفصل الصادق للرسوم', () => {
	it('الإجمالي = المجموع الفرعي + الرسوم (بعد المجموع، لا ذوبان فيه)', () => {
		const subtotal = 30;
		const fee = deliveryFeeFor('delivery', { fee: 5, minOrder: 20 });
		expect(subtotal + fee).toBe(35);
		// والإجمالي المعروض يستعمل نفس formatPrice — نفس عيار السطور
		expect(minOrderMessage(20)).not.toContain('٥');
	});
});
