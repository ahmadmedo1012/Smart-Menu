/**
 * r136 (ليبي أولاً) — مسامير تطبيع هاتف الزبون الليبي.
 *
 * الزبون يكتب رقمه بالأرقام الشرقية (٠٩١٢…) أو بفواصل — قبل r136 كان
 * الرقم يصل خاماً إلى التخزين/الإيصال، وبوابة الولاء كانت ترفض الأرقام
 * الشرقية أصلاً. هذه المسامير تثبّت العقد الجديد:
 *  - طيّ الأرقام الشرقية إلى غربية أولاً (نفس درس r133-A12 M1)
 *  - شدّ الفواصل (مسافات/شرطات/أقواس/نقاط)، حفظ + البادئة
 *  - لا إكراه للصيغة (لا إضافة 218 ولا قصّ جذع 0) — الحياد البايتي
 *    للبيانات المخزنة سابقاً عمداً (09XXXXXXXX يخرج كما دخل)
 *  - القمامة بلا أرقام → undefined (تُخزَّن "" كما كانت تخزَّن خاماً سابقاً)
 */
import { describe, it, expect } from 'vitest';
import { normalizeCustomerPhone, CUSTOMER_PHONE_RE } from '@/lib/phone';

describe('normalizeCustomerPhone (r136)', () => {
	it('folds Eastern Arabic digits to Western — ٠٩١٢… becomes callable', () => {
		expect(normalizeCustomerPhone('٠٩١٢٣٤٥٦٧٨')).toBe('0912345678');
	});

	it('folds Eastern digits inside +218 international format', () => {
		expect(normalizeCustomerPhone('+٢١٨٩١٢٣٤٥٦٧٨')).toBe('+218912345678');
	});

	it('strips separators: spaces, dashes, parens, dots', () => {
		expect(normalizeCustomerPhone('0912 345 678')).toBe('0912345678');
		expect(normalizeCustomerPhone('0912-345-678')).toBe('0912345678');
		expect(normalizeCustomerPhone('(0912) 345.678')).toBe('0912345678');
		expect(normalizeCustomerPhone('+218 91 234 5678')).toBe('+218912345678');
	});

	it('is byte-neutral for already-clean Libyan formats (no 218 coercion, no trunk stripping)', () => {
		expect(normalizeCustomerPhone('0912345678')).toBe('0912345678');
		expect(normalizeCustomerPhone('+218912345678')).toBe('+218912345678');
	});

	it('keeps a leading + only when it leads (mid-string + is junk)', () => {
		expect(normalizeCustomerPhone('+0912345678')).toBe('+0912345678');
		expect(normalizeCustomerPhone('09+123')).toBe('09123');
	});

	it('garbage without digits → undefined (stored as "" downstream)', () => {
		expect(normalizeCustomerPhone('abc')).toBeUndefined();
		expect(normalizeCustomerPhone('')).toBeUndefined();
		expect(normalizeCustomerPhone(null)).toBeUndefined();
		expect(normalizeCustomerPhone(undefined)).toBeUndefined();
	});

	it('separators-only input → undefined', () => {
		expect(normalizeCustomerPhone(' - () ')).toBeUndefined();
	});
});

describe('CUSTOMER_PHONE_RE (loyalty gate contract)', () => {
	it('accepts the canonical Libyan shapes after normalization', () => {
		expect(CUSTOMER_PHONE_RE.test('0912345678')).toBe(true);
		expect(CUSTOMER_PHONE_RE.test('+218912345678')).toBe(true);
	});

	it('rejects shapes the gate always rejected', () => {
		expect(CUSTOMER_PHONE_RE.test('')).toBe(false);
		expect(CUSTOMER_PHONE_RE.test('abc')).toBe(false);
		// length bounds: 6 digits (too short) and 16 digits (too long)
		expect(CUSTOMER_PHONE_RE.test('091234')).toBe(false);
		expect(CUSTOMER_PHONE_RE.test('0912345678901234')).toBe(false);
	});
});
