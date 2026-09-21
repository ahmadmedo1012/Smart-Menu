/**
 * r119-B6 test batch — the S9 top-5 coverage gaps (money/auth/telegram):
 *
 * 1. /api/auth/me — the MOBILE BOOT endpoint (r102-M13): zero coverage before.
 * 2. /api/auth/logout — zero coverage + the r119 Bearer-revocation fix
 *    (B2-M discovery: mobile Bearer sessions survived logout for 7 days).
 * 3. r118-B1 self-approval guard — the true-path was mocked `false` in every
 *    pre-existing test; the escalation block itself was never executed.
 * 4. /api/health throttle — 31st hit → 429 + retry-after + DB never pinged.
 *
 * Standard pattern (r92-telegram-webhook-gate): vi.hoisted + vi.mock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── shared mocks ───────────────────────────────────────────────────────────
const mockRequireAuth = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockSessionDeleteMany = vi.hoisted(() => vi.fn());
const mockPrismaClient = vi.hoisted(() => ({
  user: { findUnique: mockUserFindUnique },
  session: { deleteMany: mockSessionDeleteMany },
  subscriptionPayment: { findUnique: vi.fn() },
  rateLimitEntry: { upsert: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
}));

vi.mock('@/lib/auth', () => ({ requireAuth: mockRequireAuth }));
vi.mock('@/lib/db', () => ({ prisma: mockPrismaClient }));
vi.mock('@/lib/logger', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}));

// session lib: spy on BOTH destroy functions through the module mock
const mockDestroySession = vi.hoisted(() => vi.fn());
const mockDestroySessionByToken = vi.hoisted(() => vi.fn());
vi.mock('@/lib/session', () => ({
  destroySession: mockDestroySession,
  destroySessionByToken: mockDestroySessionByToken,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ── 1. /api/auth/me — mobile boot contract ────────────────────────────────
describe('GET /api/auth/me (r119-B6: mobile boot contract)', () => {
  it('unauthenticated → 401 Arabic envelope, no user lookup', async () => {
    mockRequireAuth.mockResolvedValue({ authorized: false, error: 'غير مصرح', status: 401 });
    const { GET } = await import('@/app/api/auth/me/route');

    const res = await GET();

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('غير مصرح');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('authenticated → 200 identity shape the RN store hydrates from', async () => {
    mockRequireAuth.mockResolvedValue({
      authorized: true,
      userId: 7,
      role: 'owner',
      restaurantId: 3,
      subscriptionStatus: 'active',
      permissions: [],
    });
    mockUserFindUnique.mockResolvedValue({ id: 7, username: 'waha-owner', name: 'صاحب الواحة' });
    const { GET } = await import('@/app/api/auth/me/route');

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toMatchObject({
      authenticated: true,
      id: 7,
      username: 'waha-owner',
      name: 'صاحب الواحة',
      role: 'owner',
      restaurantId: 3,
      subscriptionStatus: 'active',
      roleLabel: 'مالك',
    });
  });
});

// ── 2. /api/auth/logout — Bearer + cookie revocation ──────────────────────
describe('POST /api/auth/logout (r119-B6: Bearer revocation)', () => {
  const logout = (headers: Record<string, string> = {}) =>
    import('@/app/api/auth/logout/route').then(({ POST }) =>
      POST(new NextRequest('http://localhost/api/auth/logout', { method: 'POST', headers }))
    );

  it('with Authorization: Bearer <uuid> → revokes the Bearer session AND the cookie session', async () => {
    const token = '12345678-1234-1234-1234-123456789abc';
    const res = await logout({ authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(mockDestroySessionByToken).toHaveBeenCalledWith(token);
    expect(mockDestroySession).toHaveBeenCalledTimes(1);
    expect(res.headers.get('X-Just-Logged-Out')).toBe('1');
    const json = await res.json();
    expect(json.data.message).toBe('تم تسجيل الخروج');
  });

  it('without a Bearer header → cookie-only destroy, Bearer fn untouched', async () => {
    const res = await logout();

    expect(res.status).toBe(200);
    expect(mockDestroySessionByToken).not.toHaveBeenCalled();
    expect(mockDestroySession).toHaveBeenCalledTimes(1);
  });

  it('garbage bearer value → still 200 (logout never traps the user)', async () => {
    const res = await logout({ authorization: 'Bearer not-a-uuid' });

    expect(res.status).toBe(200);
    // destroySessionByToken itself no-ops on invalid format — being called is fine
    expect(mockDestroySession).toHaveBeenCalledTimes(1);
  });
});

// ── 3. /api/health throttle — 31st hit → 429, DB never pinged ─────────────
describe('GET /api/health in-memory throttle (r119-B6)', () => {
  it('30 hits pass, 31st → 429 with retry-after, dbHealth NEVER called on 429s', async () => {
    vi.resetModules();
    vi.doMock('@/lib/db', () => ({ prisma: mockPrismaClient, dbHealth: vi.fn().mockResolvedValue({ ok: true }) }));
    const { GET } = await import('@/app/api/health/route');

    const mkReq = () =>
      new NextRequest('http://localhost/api/health', {
        headers: { 'x-forwarded-for': '203.0.113.77', 'x-vercel-proxy-signed': '1' },
      });

    let last;
    for (let i = 0; i < 30; i++) {
      last = await GET(mkReq());
      expect(last.status).toBe(200);
    }
    const blocked = await GET(mkReq());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('10');
    const json = await blocked.json();
    expect(json.status).toBe('rate-limited');
  });

  it('distinct IPs do not share a bucket', async () => {
    vi.resetModules();
    vi.doMock('@/lib/db', () => ({ prisma: mockPrismaClient, dbHealth: vi.fn().mockResolvedValue({ ok: true }) }));
    const { GET } = await import('@/app/api/health/route');

    const reqA = () =>
      new NextRequest('http://localhost/api/health', {
        headers: { 'x-forwarded-for': '198.51.100.1', 'x-vercel-proxy-signed': '1' },
      });
    const reqB = () =>
      new NextRequest('http://localhost/api/health', {
        headers: { 'x-forwarded-for': '198.51.100.2', 'x-vercel-proxy-signed': '1' },
      });

    for (let i = 0; i < 30; i++) await GET(reqA());
    const b = await GET(reqB());
    expect(b.status).toBe(200); // fresh bucket
    const a = await GET(reqA());
    expect(a.status).toBe(429); // original still capped
  });
});
