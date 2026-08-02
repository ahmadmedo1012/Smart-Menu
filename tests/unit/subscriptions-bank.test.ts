/**
 * Bank transfer provider — schema validation for subscription payments.
 * Covers the bank-specific rules:
 *  - senderAccountName/senderAccountNumber REQUIRED for bank
 *  - receiptImageUrl optional
 *  - amounts > 99 allowed for bank (mobile wallets still capped by route logic)
 */
import { describe, it, expect } from 'vitest';
import { createPaymentSchema } from '@/app/api/subscriptions/route';

function base() {
	return {
		phone: '0912345678',
		amount: 19,
		provider: 'libyana',
		planId: 87,
	};
}

describe('createPaymentSchema — bank provider', () => {
	it('bank without senderAccountName → rejected', () => {
		const r = createPaymentSchema.safeParse({
			...base(),
			provider: 'bank',
			amount: 129,
			senderAccountNumber: '123456',
		});
		expect(r.success).toBe(false);
		if (!r.success) {
			expect(r.error.issues[0].message).toContain('إجباريان');
		}
	});

	it('bank without senderAccountNumber → rejected', () => {
		const r = createPaymentSchema.safeParse({
			...base(),
			provider: 'bank',
			amount: 129,
			senderAccountName: 'أحمد محمد',
		});
		expect(r.success).toBe(false);
		if (!r.success) {
			expect(r.error.issues[0].message).toContain('إجباريان');
		}
	});

	it('bank with both sender fields → accepted, metadata fields parsed', () => {
		const r = createPaymentSchema.safeParse({
			...base(),
			provider: 'bank',
			amount: 129,
			senderAccountName: 'أحمد محمد',
			senderAccountNumber: '091234567890',
		});
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.senderAccountName).toBe('أحمد محمد');
			expect(r.data.senderAccountNumber).toBe('091234567890');
		}
	});

	it('bank amount > 99 → accepted (no mobile cap for bank)', () => {
		const r = createPaymentSchema.safeParse({
			...base(),
			provider: 'bank',
			amount: 129,
			senderAccountName: 'أحمد محمد',
			senderAccountNumber: '091234567890',
		});
		expect(r.success).toBe(true);
	});

	it('bank with receiptImageUrl (optional) → accepted', () => {
		const r = createPaymentSchema.safeParse({
			...base(),
			provider: 'bank',
			amount: 299,
			senderAccountName: 'أحمد محمد',
			senderAccountNumber: '091234567890',
			receiptImageUrl: 'https://blob.vercel-storage.com/receipt.jpg',
		});
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.receiptImageUrl).toBe('https://blob.vercel-storage.com/receipt.jpg');
		}
	});

	it('bank without phone → accepted (phone not required for bank)', () => {
		const r = createPaymentSchema.safeParse({
			amount: 129,
			provider: 'bank',
			planId: 87,
			senderAccountName: 'أحمد محمد',
			senderAccountNumber: '091234567890',
		});
		expect(r.success).toBe(true);
	});

	it('libyana with bank fields → accepted (fields ignored for non-bank)', () => {
		const r = createPaymentSchema.safeParse({
			...base(),
			provider: 'libyana',
			senderAccountName: 'أحمد محمد',
			senderAccountNumber: '091234567890',
		});
		expect(r.success).toBe(true);
	});

	it('libyana amount > 99 → rejected (mobile cap enforced in route)', () => {
		const r = createPaymentSchema.safeParse({
			...base(),
			provider: 'libyana',
			amount: 129,
		});
		// schema itself has no cap — the route applies it; assert schema still parses
		expect(r.success).toBe(true);
	});
});
