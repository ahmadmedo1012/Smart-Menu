/**
 * test(r140) — عقد هاتف الدفع الموحد (A140-MK P-SM-1).
 *
 * القصة: بوابة الدفع كانت آخر المتخلفين عن عقد الهاتف الأسطولي r138
 * (الملحوظ المؤجل منذ r138-SO): `/^09\d{8}$/` محمول-فقط بعشر خانات
 * بالضبط، برفض المحمول القصير 091234567 الذي تقبله الأسطولة كلها،
 * وبلا تطبيع للصيغ الدولية/الفواصل/الجذع — بينما الزبون نفسه يمر
 * من مساري الطلبات والولاء بتطبيع أوسع.
 *
 * r140 وحّدت البوابة: تطبيع عائلي كامل (طي شرقية → شدّ غير الأرقام →
 * تجريد 00218/218 → جذع 0 للمحمول فقط) ثم `/^09\d{7,8}$/` (محمول
 * 9-10 خانات). الأرضي يُرفض عمدًا — المحافظ (ليبيانا/مدار) أرقام
 * محمول حصرًا.
 *
 * كل حالة هنا توأم لاختبارات SL/SO/SB (نفس العقد الأسطولي r138).
 */
import { describe, expect, it } from 'vitest';
import { createPaymentSchema, paymentPhoneField } from '@/lib/payment-schema';

const valid = (phone: string) => createPaymentSchema.safeParse({
  phone,
  amount: 19,
  provider: 'libyana',
  planId: 1,
});

const phoneOf = (phone: unknown): string | undefined =>
  createPaymentSchema.safeParse({ phone, amount: 19, provider: 'libyana', planId: 1 })
    .success
    ? (createPaymentSchema.parse({ phone, amount: 19, provider: 'libyana', planId: 1 }).phone as string)
    : undefined;

describe('r140 — عقد هاتف الدفع الأسطولي الموحد (محمول 9-10 خانات + تطبيع كامل)', () => {
  describe('القبول (كل صيغ الإدخال الليبية الواقعية)', () => {
    it('المحمول الكامل 10 خانات — الشكل الأساسي', () => {
      expect(valid('0912345678').success).toBe(true);
      expect(phoneOf('0912345678')).toBe('0912345678');
    });

    it('المحمول القصير 9 خانات — نموذج المشغّلين القصار (كان يُرفض قبل r140)', () => {
      expect(valid('091234567').success).toBe(true);
      expect(phoneOf('091234567')).toBe('091234567');
    });

    it('الدولي +218 يُجرَّد إلى المحلي', () => {
      expect(phoneOf('+218912345678')).toBe('0912345678');
    });

    it('الدولي 00218 يُجرَّد إلى المحلي', () => {
      expect(phoneOf('00218912345678')).toBe('0912345678');
    });

    it('الدولي بفواصل «+218 91 234 5678» — الفواصل تُشدّ قبل التحقق', () => {
      expect(phoneOf('+218 91 234 5678')).toBe('0912345678');
    });

    it('الأرقام الشرقية ٠٩١٢٣٤٥٦٧ تُطوى إلى غربية (درس r138 محفوظ)', () => {
      expect(phoneOf('٠٩١٢٣٤٥٦٧')).toBe('091234567');
      expect(phoneOf('٠٩١٢٣٤٥٦٧٨')).toBe('0912345678');
    });

    it('جذع 0 المفقود للمحمول فقط: 9xxxxxxx و9xxxxxxxx يُسبقان بالصفر (توأم الأسطولة)', () => {
      expect(phoneOf('91234567')).toBe('091234567');
      expect(phoneOf('912345678')).toBe('0912345678');
    });
  });

  describe('الرفض (حدود العقد — رسالة واحدة تسمّي العائلة)', () => {
    it('الأرضي 0211234567 يُرفض: المحافظ أرقام محمول حصرًا', () => {
      const r = valid('0211234567');
      expect(r.success).toBe(false);
      if (!r.success) {
        const msg = JSON.stringify(r.error.issues[0]?.message);
        expect(msg).toContain('محمول');
      }
    });

    it('القمامة 123456789 لا تتحول أرضيًا بجذع أعمى (حكم r138)', () => {
      expect(valid('123456789').success).toBe(false);
    });

    it('الأرضي بلا جذع 212345678 يُرفض (بوابة الجذع محمول-فقط)', () => {
      expect(valid('212345678').success).toBe(false);
    });

    it('المحمول القصير جدًا 0912345 (7 خانات) يُرفض', () => {
      expect(valid('0912345').success).toBe(false);
    });

    it('الطويل الزائد 09123456789 (11 خانة) يُرفض', () => {
      expect(valid('09123456789').success).toBe(false);
    });

    it('غير الرقمي «abc» يُرفض — لا يتحول الغياب إلى قبول', () => {
      expect(valid('abc').success).toBe(false);
    });

    it('بادئة أجنبية +441632960000 تُرفض (تجريد 218 لا ينطبق)', () => {
      expect(valid('+441632960000').success).toBe(false);
    });
  });

  describe('غياب الحقل يبقى اختياريًا (مسار البنك بلا هاتف)', () => {
    it('الحقل نفسه يقبل undefined — رد البنك يمر بلا phone (createPaymentSchema يجرب في اختبارات المسار الكاملة)', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const r = paymentPhoneField.safeParse(undefined);
      expect(r.success).toBe(true);
    });
  });
});
