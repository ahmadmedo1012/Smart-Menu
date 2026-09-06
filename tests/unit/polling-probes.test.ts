/**
 * Round88-D2 — GET /api/user/events + GET /api/health unit coverage (both
 * were 0% lcov). These are the lightweight polling/probe endpoints:
 *
 *   - /api/user/events (round84: replaced the SSE stream; round87-B6:
 *     server-side userId filter + sinceId cursor) — every behavior that
 *     keeps user feeds isolated and cursor-based.
 *   - /api/health — the ok/degraded envelope and status codes that
 *     uptime monitors key off.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ───────────────────────────────────────────────────────

const mockSystemEventFindMany = vi.hoisted(() => vi.fn());
const mockDbHealth = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
        prisma: { systemEvent: { findMany: mockSystemEventFindMany } },
        dbHealth: mockDbHealth,
}));

const authHolder = vi.hoisted(() => ({
        value: {
                authorized: true as boolean,
                role: 'owner' as string,
                restaurantId: 1 as number | null,
                userId: 7 as number | null,
                permissions: [] as string[],
        },
}));
vi.mock('@/lib/auth', () => ({
        requireAuth: () => Promise.resolve(authHolder.value),
}));

// ── Helpers ─────────────────────────────────────────────────────────────

async function callEvents(path = '') {
        const { GET } = await import('@/app/api/user/events/route');
        return GET(new NextRequest(`http://localhost/api/user/events${path}`));
}

async function callHealth() {
        const { GET } = await import('@/app/api/health/route');
        return GET();
}

const EVENTS = [
        { id: 101, eventType: 'order_created', severity: 'info', metadata: { userId: 7 } },
        { id: 102, eventType: 'payment_approved', severity: 'info', metadata: { userId: 7 } },
];

beforeEach(() => {
        vi.clearAllMocks();
        authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: 7, permissions: [] };
        mockSystemEventFindMany.mockResolvedValue(EVENTS);
        mockDbHealth.mockResolvedValue({ ok: true, latencyMs: 3 });
});

// ── GET /api/user/events (round87-B6) ───────────────────────────────────

describe('GET /api/user/events — auth gate', () => {
        it('unauthenticated → 401, no query', async () => {
                authHolder.value = { authorized: false, role: 'owner', restaurantId: null, userId: null, permissions: [] };

                const res = await callEvents();

                expect(res.status).toBe(401);
                expect(mockSystemEventFindMany).not.toHaveBeenCalled();
        });

        it('authorized but userId null → 401 (events are keyed by userId)', async () => {
                authHolder.value = { authorized: true, role: 'owner', restaurantId: 1, userId: null, permissions: [] };

                const res = await callEvents();

                expect(res.status).toBe(401);
        });
});

describe('GET /api/user/events — sinceId cursor + userId isolation', () => {
        it('sinceId → strictly-greater id cursor in the where clause', async () => {
                const res = await callEvents('?sinceId=42');

                expect(res.status).toBe(200);
                expect(mockSystemEventFindMany).toHaveBeenCalledWith(
                        expect.objectContaining({ where: { id: { gt: 42 }, metadata: { path: ['userId'], equals: 7 } } })
                );
        });

        it('no sinceId → cursor starts at 0 (full replay for a fresh client)', async () => {
                await callEvents();

                expect(mockSystemEventFindMany.mock.calls[0][0].where.id).toEqual({ gt: 0 });
        });

        it('non-numeric sinceId falls back to 0 instead of erroring', async () => {
                await callEvents('?sinceId=abc');

                expect(mockSystemEventFindMany.mock.calls[0][0].where.id).toEqual({ gt: 0 });
        });

        it('server-side userId filter — one user NEVER sees another user\'s events', async () => {
                await callEvents();

                const where = mockSystemEventFindMany.mock.calls[0][0].where;
                expect(where.metadata).toEqual({ path: ['userId'], equals: 7 });
        });

        it('oldest-first ordering with a 50-event page cap (client replays in order)', async () => {
                await callEvents();

                const arg = mockSystemEventFindMany.mock.calls[0][0];
                expect(arg.orderBy).toEqual({ id: 'asc' });
                expect(arg.take).toBe(50);
        });

        it('returns the rows verbatim in the success envelope', async () => {
                const res = await callEvents();

                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual(EVENTS);
        });

        it('empty result → success with empty array (poll-friendly)', async () => {
                mockSystemEventFindMany.mockResolvedValue([]);

                const res = await callEvents('?sinceId=999');

                const json = await res.json();
                expect(json.success).toBe(true);
                expect(json.data).toEqual([]);
        });
});

// ── GET /api/health ─────────────────────────────────────────────────────

describe('GET /api/health — db probe envelope', () => {
        it('db reachable → 200 with status ok / db connected and the measured latency', async () => {
                const res = await callHealth();

                expect(res.status).toBe(200);
                const json = await res.json();
                expect(json.status).toBe('ok');
                expect(json.db).toBe('connected');
                expect(json.dbLatencyMs).toBe(3);
                // uptime/env/version are monitor-consumable scalars
                expect(typeof json.uptime).toBe('number');
                expect(typeof json.env).toBe('string');
                expect(() => new Date(json.timestamp)).not.toThrow();
        });

        it('db unreachable → 503 degraded (a cached "ok" would mask an outage)', async () => {
                mockDbHealth.mockResolvedValue({ ok: false, latencyMs: 10001 });

                const res = await callHealth();

                expect(res.status).toBe(503);
                const json = await res.json();
                expect(json.status).toBe('degraded');
                expect(json.db).toBe('error');
                expect(json.dbLatencyMs).toBe(10001);
        });
});
