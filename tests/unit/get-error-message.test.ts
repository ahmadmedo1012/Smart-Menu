/**
 * Round87-D5 — src/lib/get-error-message.ts coverage (was 0% lcov).
 *
 * Contract notes (documented by these tests):
 *   - Error instances: message returned verbatim when non-empty.
 *   - Strings: returned verbatim when non-blank (NOT trimmed).
 *   - Plain objects: their .message is intentionally NOT extracted — only
 *     real Error instances qualify. Falls back instead.
 */
import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '@/lib/get-error-message';

describe('getErrorMessage', () => {
  describe('Error instances', () => {
    it('returns the error message', () => {
      expect(getErrorMessage(new Error('فشل الاتصال'))).toBe('فشل الاتصال');
    });

    it('Error with an EMPTY message falls back (no blank toast)', () => {
      expect(getErrorMessage(new Error(''))).toBe('تعذّر تحميل البيانات');
    });

    it('subclasses (TypeError, RangeError) behave like Error', () => {
      expect(getErrorMessage(new TypeError('not a function'))).toBe('not a function');
    });
  });

  describe('string throwables', () => {
    it('non-empty string is returned as-is', () => {
      expect(getErrorMessage('رسالة مخصصة')).toBe('رسالة مخصصة');
    });

    it('blank/whitespace-only string falls back', () => {
      expect(getErrorMessage('')).toBe('تعذّر تحميل البيانات');
      expect(getErrorMessage('   ')).toBe('تعذّر تحميل البيانات');
    });

    it('string is returned VERBATIM (not trimmed)', () => {
      expect(getErrorMessage(' padded ')).toBe(' padded ');
    });
  });

  describe('non-Error throwables', () => {
    it('plain object with a message property does NOT leak it (only Error instances qualify)', () => {
      expect(getErrorMessage({ message: 'raw server internals' })).toBe('تعذّر تحميل البيانات');
    });

    it('Response-like object { ok:false, status:500 } falls back', () => {
      expect(getErrorMessage({ ok: false, status: 500 })).toBe('تعذّر تحميل البيانات');
    });

    it('null / undefined / numbers / empty objects fall back', () => {
      expect(getErrorMessage(null)).toBe('تعذّر تحميل البيانات');
      expect(getErrorMessage(undefined)).toBe('تعذّر تحميل البيانات');
      expect(getErrorMessage(42)).toBe('تعذّر تحميل البيانات');
      expect(getErrorMessage({})).toBe('تعذّر تحميل البيانات');
    });
  });

  describe('fallback parameter', () => {
    it('custom fallback is honored for non-Error values', () => {
      expect(getErrorMessage(null, 'تعذر حفظ الإعدادات')).toBe('تعذر حفظ الإعدادات');
      expect(getErrorMessage({ message: 'x' }, 'تعذر حفظ الإعدادات')).toBe('تعذر حفظ الإعدادات');
    });

    it('custom fallback is NOT used when a real message exists', () => {
      expect(getErrorMessage(new Error('حقيقي'), 'احتياطي')).toBe('حقيقي');
      expect(getErrorMessage('نص', 'احتياطي')).toBe('نص');
    });
  });
});
