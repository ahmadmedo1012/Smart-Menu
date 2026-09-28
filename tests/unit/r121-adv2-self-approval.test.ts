/**
 * r121-ADV2-1: isPaymentSelfApproval is now USER-IDENTITY-keyed (was: payer's
 * linked chat only — a payer whose account has no/different linked chat could
 * still resolve their own payment from the Telegram keyboard). These tests pin
 * the real implementation (sibling suites mock the whole module).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTransaction = vi.fn();
const mockPaymentFindUnique = vi.fn();
const mockUserFindFirst = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: mockTransaction,
    subscriptionPayment: { findUnique: mockPaymentFindUnique },
    user: { findFirst: mockUserFindFirst },
  },
}));

describe('isPaymentSelfApproval (r121-ADV2-1 — userId-keyed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default $transaction shape: [payment, approverUser]
    mockTransaction.mockImplementation(async (ops) => Promise.all(ops));
  });

  it('SAME user account → self-approval even when the payer has NO linked chat', async () => {
    mockPaymentFindUnique.mockResolvedValue({ userId: 42, user: { telegramChatId: null } });
    mockUserFindFirst.mockResolvedValue({ id: 42 }); // approver telegram id → user 42
    const { isPaymentSelfApproval } = await import('@/lib/subscription-decisions');
    expect(await isPaymentSelfApproval(7, '1099')).toBe(true);
  });

  it('SAME user account → self-approval even with a DIFFERENT linked chat on the payer', async () => {
    mockPaymentFindUnique.mockResolvedValue({ userId: 42, user: { telegramChatId: '555' } });
    mockUserFindFirst.mockResolvedValue({ id: 42 });
    const { isPaymentSelfApproval } = await import('@/lib/subscription-decisions');
    expect(await isPaymentSelfApproval(7, '1099')).toBe(true);
  });

  it('DIFFERENT user with NO chat overlap → not self-approval', async () => {
    mockPaymentFindUnique.mockResolvedValue({ userId: 42, user: { telegramChatId: '555' } });
    mockUserFindFirst.mockResolvedValue({ id: 99 }); // approver's account, telegram 1099
    const { isPaymentSelfApproval } = await import('@/lib/subscription-decisions');
    expect(await isPaymentSelfApproval(7, '1099')).toBe(false);
  });

  it('ambiguous dual-link (payer chat == approver telegram, different accounts) → BLOCKED (conservative)', async () => {
    // Payer (user 42) linked chat 1099 while approver account (99) also owns
    // telegram 1099 — inconsistent data; the safe read is "same Telegram
    // person", so the guard blocks rather than risks a self-approval.
    mockPaymentFindUnique.mockResolvedValue({ userId: 42, user: { telegramChatId: '1099' } });
    mockUserFindFirst.mockResolvedValue({ id: 99 });
    const { isPaymentSelfApproval } = await import('@/lib/subscription-decisions');
    expect(await isPaymentSelfApproval(7, '1099')).toBe(true);
  });

  it('approver telegram id linked to NO account → legacy chat-match fallback', async () => {
    mockPaymentFindUnique.mockResolvedValue({ userId: 42, user: { telegramChatId: '1099' } });
    mockUserFindFirst.mockResolvedValue(null); // no account for the approver
    const { isPaymentSelfApproval } = await import('@/lib/subscription-decisions');
    expect(await isPaymentSelfApproval(7, '1099')).toBe(true);
    expect(await isPaymentSelfApproval(7, '2000')).toBe(false);
  });

  it('unknown payment → false (guard never blocks the 404 path)', async () => {
    mockPaymentFindUnique.mockResolvedValue(null);
    mockUserFindFirst.mockResolvedValue({ id: 42 });
    const { isPaymentSelfApproval } = await import('@/lib/subscription-decisions');
    expect(await isPaymentSelfApproval(999, '1099')).toBe(false);
  });
});
